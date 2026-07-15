import { describe, it, expect, vi, afterEach } from 'vitest';

// ── Pure helper functions (mirrored from worker/src/index.js) ────────────────
// We test the pure logic in isolation without importing the worker module,
// then test HTTP routing via the actual fetch handler with mocked globals.

const STOP = new Set(['the','and','for','that','this','with','does','what','how','why','where','when','are','was','use','using','code','file','files','work','works','about','into','from','your']);
const SRC_RE = /\.(js|ts|jsx|tsx|py|go|rb|java|rs|c|cc|cpp|h|hpp|cs|php|swift|kt|md|json|toml|yaml|yml|html|css|sh)$/i;
const MAX_FILES = 5;

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

  const readme = paths.find((p) => /(^|\/)readme\.md$/i.test(p));
  if (readme && !picked.includes(readme)) picked.unshift(readme);

  if (picked.length === 0) {
    const entry = paths.filter((p) => /(readme|index|main|app)\.[a-z]+$/i.test(p));
    picked = (entry.length ? entry : paths).slice(0, MAX_FILES);
  }
  return picked.slice(0, MAX_FILES);
}

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

// ── selectFiles unit tests ───────────────────────────────────────────────────

describe('selectFiles()', () => {
  const paths = [
    'README.md',
    'src/index.js',
    'src/auth.js',
    'src/api.js',
    'src/utils.js',
    'src/components/Button.jsx',
    'tests/auth.test.js',
    'package.json',
  ];

  it('always prepends README.md when it exists', () => {
    const result = selectFiles(paths, 'how does auth work?');
    expect(result[0]).toBe('README.md');
  });

  it('includes files whose names match question terms', () => {
    const result = selectFiles(paths, 'how does auth work?');
    expect(result).toContain('src/auth.js');
  });

  it('respects the MAX_FILES cap', () => {
    const result = selectFiles(paths, 'auth api utils button index');
    expect(result.length).toBeLessThanOrEqual(MAX_FILES);
  });

  it('falls back to entry-point files when no terms match', () => {
    const result = selectFiles(paths, 'zzz yyy xxx');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((p) => /(readme|index|main|app)/i.test(p))).toBe(true);
  });

  it('returns an empty array when paths is empty', () => {
    const result = selectFiles([], 'anything');
    expect(result).toEqual([]);
  });

  it('scores filename matches higher than directory matches', () => {
    const testPaths = ['src/auth/helper.js', 'auth.js'];
    const result = selectFiles(testPaths, 'auth');
    expect(result[0]).toBe('auth.js');
  });

  it('filters out stop words from the query terms', () => {
    const result = selectFiles(['src/login.js', 'src/other.js'], 'the and for login');
    expect(result).toContain('src/login.js');
  });

  it('does not include README twice when it already matched by score', () => {
    const result = selectFiles(['README.md', 'src/readme-helper.js'], 'readme');
    const readmeCount = result.filter((p) => p === 'README.md').length;
    expect(readmeCount).toBe(1);
  });
});

// ── corsHeaders unit tests ───────────────────────────────────────────────────

describe('corsHeaders()', () => {
  function makeRequest(origin) {
    return { headers: { get: (key) => (key === 'Origin' ? origin : null) } };
  }

  it('reflects the Origin header when present', () => {
    const headers = corsHeaders(makeRequest('https://example.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
  });

  it('falls back to "*" when no Origin header is present', () => {
    const headers = corsHeaders(makeRequest(null));
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('includes POST in the allowed methods', () => {
    const headers = corsHeaders(makeRequest(null));
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('includes Content-Type in the allowed headers', () => {
    const headers = corsHeaders(makeRequest(null));
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  it('sets the max-age to 86400', () => {
    const headers = corsHeaders(makeRequest(null));
    expect(headers['Access-Control-Max-Age']).toBe('86400');
  });
});

// ── json helper unit tests ───────────────────────────────────────────────────

describe('json() helper', () => {
  it('returns a Response with the correct status', () => {
    const res = json({ ok: true }, 200, {});
    expect(res.status).toBe(200);
  });

  it('returns a Response with JSON content-type', () => {
    const res = json({ ok: true }, 200, {});
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('serialises the body correctly', async () => {
    const res = json({ answer: 'hello', files: ['a.js'] }, 200, {});
    const body = await res.json();
    expect(body).toEqual({ answer: 'hello', files: ['a.js'] });
  });

  it('merges cors headers into the response', () => {
    const cors = { 'Access-Control-Allow-Origin': 'https://example.com' };
    const res = json({}, 200, cors);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
  });

  it('uses the provided status code for error responses', () => {
    const res = json({ error: 'not found' }, 404, {});
    expect(res.status).toBe(404);
  });
});

// ── Worker HTTP routing tests ────────────────────────────────────────────────
// We import the actual worker and mock global fetch so no real network calls
// are made. The AI binding is also mocked.

// Import the worker module at the top level (Vitest supports top-level await).
const workerMod = await import('../../worker/src/index.js');
const workerHandler = workerMod.default;

describe('Worker fetch handler', () => {
  const worker = workerHandler;

  // GitHub API mock responses used by the worker internals
  const mockRepoInfo = { default_branch: 'main' };
  const mockTree = {
    tree: [
      { type: 'blob', path: 'README.md' },
      { type: 'blob', path: 'src/index.js' },
    ],
  };
  const mockFileContent = 'console.log("hello");';

  function makeEnv(overrides = {}) {
    return {
      AI: {
        run: vi.fn().mockResolvedValue({ response: 'mocked AI answer' }),
      },
      GITHUB_TOKEN: undefined,
      ...overrides,
    };
  }

  function makeRequest(method, pathname, body = null, origin = 'https://example.com') {
    const url = `https://worker.example.com${pathname}`;
    const init = {
      method,
      headers: new Headers({ 'Content-Type': 'application/json', Origin: origin }),
    };
    if (body) init.body = JSON.stringify(body);
    return new Request(url, init);
  }

  function mockFetchSequence(...responses) {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      const res = responses[Math.min(call, responses.length - 1)];
      call++;
      return Promise.resolve(res);
    }));
  }

  function makeJsonResponse(data, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('responds to OPTIONS with 200 and CORS headers', async () => {
    const req = makeRequest('OPTIONS', '/ask');
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  it('returns 200 with { ok: true } for GET /health', async () => {
    const req = makeRequest('GET', '/health');
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 for unknown paths', async () => {
    const req = makeRequest('GET', '/unknown');
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(404);
  });

  it('returns 405 for non-POST requests to /ask', async () => {
    const req = makeRequest('GET', '/ask');
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(405);
  });

  it('returns 500 when the AI binding is missing', async () => {
    const req = makeRequest('POST', '/ask', { repo: 'owner/repo', question: 'hi' });
    const res = await worker.fetch(req, { AI: null });
    expect(res.status).toBe(500);
  });

  it('returns 400 when repo field is missing', async () => {
    const req = makeRequest('POST', '/ask', { question: 'hi' });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });

  it('returns 400 when question field is missing', async () => {
    const req = makeRequest('POST', '/ask', { repo: 'owner/repo' });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });

  it('returns 400 when repo is not in owner/name format', async () => {
    const req = makeRequest('POST', '/ask', { repo: 'badformat', question: 'hi' });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid JSON body', async () => {
    const req = new Request('https://worker.example.com/ask', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', Origin: 'https://example.com' }),
      body: 'not-json',
    });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });

  it('returns 200 with answer and files on a valid /ask request', async () => {
    // Mock the three GitHub API calls the worker makes:
    // 1. GET /repos/{repo}  → default_branch
    // 2. GET /repos/{repo}/git/trees/{branch}?recursive=1  → file tree
    // 3. GET /repos/{repo}/contents/{file}  → file content (repeated per file)
    mockFetchSequence(
      makeJsonResponse(mockRepoInfo),
      makeJsonResponse(mockTree),
      makeJsonResponse(mockFileContent),
      makeJsonResponse(mockFileContent),
    );

    const req = makeRequest('POST', '/ask', {
      repo: 'owner/repo',
      question: 'What does this repo do?',
    });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.answer).toBe('string');
    expect(Array.isArray(body.files)).toBe(true);
    expect(body.model).toBeTruthy();
  });
});
