// Forge Ask — Cloudflare Worker proxy.
// Holds ANTHROPIC_API_KEY (+ optional GITHUB_TOKEN) server-side and runs an
// agentic loop: read repo files from the GitHub API → answer with Claude.
//
// Endpoints:
//   POST /ask   { repo: "owner/name", question: "..." } -> { answer, files }
//   GET  /health
//
// Secrets (set via `wrangler secret put`):
//   ANTHROPIC_API_KEY  (required)
//   GITHUB_TOKEN       (optional — raises GitHub rate limits / enables private repos)

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';
const MAX_ITERATIONS = 8;        // safety cap on the agent loop
const MAX_TREE_PATHS = 600;      // cap the file list we put in the prompt
const MAX_FILE_BYTES = 50_000;   // truncate large files when read

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname !== '/ask') return json({ error: 'not found' }, 404, cors);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server missing ANTHROPIC_API_KEY' }, 500, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid JSON body' }, 400, cors); }
    const repo = (body && body.repo || '').trim();
    const question = (body && body.question || '').trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) return json({ error: 'repo must be "owner/name"' }, 400, cors);
    if (!question) return json({ error: 'question is required' }, 400, cors);

    try {
      const result = await answerQuestion(env, repo, question);
      return json(result, 200, cors);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502, cors);
    }
  },
};

/* ── GitHub helpers ─────────────────────────────────────────── */

function ghHeaders(env, accept = 'application/vnd.github+json') {
  const h = { 'User-Agent': 'forge-ask', Accept: accept };
  if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return h;
}

async function getDefaultBranch(env, repo) {
  const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(env) });
  if (!r.ok) throw new Error(`GitHub: cannot read repo ${repo} (${r.status})`);
  const data = await r.json();
  return data.default_branch || 'main';
}

async function listFiles(env, repo, branch) {
  const r = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders(env) }
  );
  if (!r.ok) throw new Error(`GitHub: cannot read tree for ${repo}@${branch} (${r.status})`);
  const data = await r.json();
  const paths = (data.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
  return { paths, truncated: !!data.truncated };
}

async function readFile(env, repo, branch, path) {
  const r = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(env, 'application/vnd.github.raw') }
  );
  if (r.status === 404) return { error: `File not found: ${path}` };
  if (!r.ok) return { error: `GitHub: cannot read ${path} (${r.status})` };
  let text = await r.text();
  let truncated = false;
  if (text.length > MAX_FILE_BYTES) { text = text.slice(0, MAX_FILE_BYTES); truncated = true; }
  return { text, truncated };
}

/* ── Agent loop ─────────────────────────────────────────────── */

async function answerQuestion(env, repo, question) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const branch = await getDefaultBranch(env, repo);
  const { paths, truncated } = await listFiles(env, repo, branch);

  const shown = paths.slice(0, MAX_TREE_PATHS);
  const treeNote = (paths.length > shown.length || truncated)
    ? `\n(showing ${shown.length} of ${paths.length}${truncated ? '+' : ''} files)`
    : '';

  const system =
    `You are Forge, a coding assistant answering questions about the GitHub repository "${repo}" (branch ${branch}).\n\n` +
    `You can read files with the read_file tool. Read the files you need before answering — do not guess at code you have not read. ` +
    `Cite the file paths you used. If the answer isn't in the repo, say so.\n\n` +
    `Repository files:\n${shown.join('\n')}${treeNote}`;

  const tools = [{
    name: 'read_file',
    description: 'Read the full text of a file in the repository by its path (as listed in the repository files).',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Repository-relative file path, e.g. src/index.js' } },
      required: ['path'],
    },
  }];

  const messages = [{ role: 'user', content: question }];
  const filesRead = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      tools,
      messages,
    });

    if (resp.stop_reason !== 'tool_use') {
      const answer = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { answer: answer || '(no answer produced)', files: filesRead };
    }

    // Echo the assistant turn (incl. thinking + tool_use blocks) back verbatim.
    messages.push({ role: 'assistant', content: resp.content });

    const toolResults = [];
    for (const block of resp.content) {
      if (block.type !== 'tool_use' || block.name !== 'read_file') continue;
      const path = String((block.input && block.input.path) || '');
      const file = await readFile(env, repo, branch, path);
      if (file.error) {
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: file.error });
      } else {
        if (!filesRead.includes(path)) filesRead.push(path);
        const suffix = file.truncated ? '\n\n[truncated]' : '';
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `${path}:\n\n${file.text}${suffix}` });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return { answer: 'I read several files but ran out of steps before finishing. Try a more specific question.', files: filesRead };
}

/* ── HTTP helpers ───────────────────────────────────────────── */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
