// Forge Ask — Cloudflare Worker proxy (Cloudflare Workers AI, free tier).
// A question comes in -> the worker picks the most relevant repo files from the
// GitHub API, then answers with a free Llama model running on Cloudflare's edge.
// No Anthropic key, no per-question bill (within Cloudflare's free allowance).
//
// Endpoints:
//   POST /ask   { repo: "owner/name", question: "..." } -> { answer, files, model }
//   GET  /health
//
// Optional secret (raises GitHub rate limits / enables private repos):
//   npx wrangler secret put GITHUB_TOKEN

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_FILES = 5;             // files fed to the model per question
const MAX_FILE_BYTES = 8_000;    // per-file cap (keeps the prompt within context)
const MAX_TREE_PATHS = 1_500;    // cap on how many paths we rank

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname !== '/ask') return json({ error: 'not found' }, 404, cors);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    if (!env.AI) return json({ error: 'Workers AI binding (AI) not configured' }, 500, cors);

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
  return (await r.json()).default_branch || 'main';
}

async function listFiles(env, repo, branch) {
  const r = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders(env) }
  );
  if (!r.ok) throw new Error(`GitHub: cannot read tree for ${repo}@${branch} (${r.status})`);
  const data = await r.json();
  return (data.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
}

async function readFile(env, repo, branch, path) {
  const r = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(env, 'application/vnd.github.raw') }
  );
  if (!r.ok) return null;
  let text = await r.text();
  if (text.length > MAX_FILE_BYTES) text = text.slice(0, MAX_FILE_BYTES) + '\n…[truncated]';
  return text;
}

/* ── Relevance ranking (no LLM) ─────────────────────────────── */

const STOP = new Set(['the','and','for','that','this','with','does','what','how','why','where','when','are','was','use','using','code','file','files','work','works','about','into','from','your']);
const SRC_RE = /\.(js|ts|jsx|tsx|py|go|rb|java|rs|c|cc|cpp|h|hpp|cs|php|swift|kt|md|json|toml|yaml|yml|html|css|sh)$/i;

function selectFiles(paths, question) {
  const terms = [...new Set((question.toLowerCase().match(/[a-z0-9_]+/g) || [])
    .filter((t) => t.length > 2 && !STOP.has(t)))];

  const scored = paths.map((p) => {
    const lp = p.toLowerCase();
    const name = lp.split('/').pop();
    let s = 0;
    for (const t of terms) if (lp.includes(t)) s += name.includes(t) ? 2 : 1;
    if (SRC_RE.test(lp)) s += 0.1;
    return { p, s };
  });
  scored.sort((a, b) => b.s - a.s || a.p.length - b.p.length);

  let picked = scored.filter((x) => x.s > 0).slice(0, MAX_FILES).map((x) => x.p);

  // Always give the model the README for orientation.
  const readme = paths.find((p) => /(^|\/)readme\.md$/i.test(p));
  if (readme && !picked.includes(readme)) picked.unshift(readme);

  // Nothing matched? fall back to obvious entry points, else the first few files.
  if (picked.length === 0) {
    const entry = paths.filter((p) => /(readme|index|main|app)\.[a-z]+$/i.test(p));
    picked = (entry.length ? entry : paths).slice(0, MAX_FILES);
  }
  return picked.slice(0, MAX_FILES);
}

/* ── Answer ─────────────────────────────────────────────────── */

async function answerQuestion(env, repo, question) {
  const branch = await getDefaultBranch(env, repo);
  const paths = (await listFiles(env, repo, branch)).slice(0, MAX_TREE_PATHS);
  const picked = selectFiles(paths, question);

  const blocks = [];
  const used = [];
  for (const path of picked) {
    const text = await readFile(env, repo, branch, path);
    if (text == null) continue;
    used.push(path);
    blocks.push(`--- ${path} ---\n${text}`);
  }

  const system =
    `You are Forge, a coding assistant answering questions about the GitHub repository "${repo}" (branch ${branch}). ` +
    `Answer using only the file contents provided below. Reference the file paths you used. ` +
    `If the answer is not in these files, say so plainly and suggest where in the repo to look next.\n\n` +
    `FILES:\n${blocks.join('\n\n') || '(no readable files found)'}`;

  const result = await env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: question },
    ],
    max_tokens: 2048,
  });

  const answer = (result && (result.response || '')).trim();
  return { answer: answer || '(no answer produced)', files: used, model: 'Llama 3.3 70B' };
}

/* ── HTTP helpers ───────────────────────────────────────────── */

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
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
