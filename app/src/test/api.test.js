import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askQuestion } from '../lib/api.js';

// We mock fetch globally so no real network calls are made.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('askQuestion()', () => {
  it('sends a POST request with the correct JSON body', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ answer: 'ok', files: [], model: 'test' }));

    await askQuestion('owner/repo', 'What does this do?');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/ask');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.repo).toBe('owner/repo');
    expect(body.question).toBe('What does this do?');
  });

  it('returns the parsed response on success', async () => {
    const payload = { answer: 'It does X', files: ['src/index.js'], model: 'Llama 3.3 70B' };
    fetch.mockResolvedValueOnce(makeResponse(payload));

    const result = await askQuestion('owner/repo', 'What does this do?');
    expect(result).toEqual(payload);
  });

  it('throws a user-friendly error when the server returns a non-2xx status with an error field', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ error: 'repo not found' }, 404));

    await expect(askQuestion('owner/repo', 'question')).rejects.toThrow('repo not found');
  });

  it('throws a generic error when the server returns a non-2xx status without an error field', async () => {
    fetch.mockResolvedValueOnce(makeResponse({}, 500));

    await expect(askQuestion('owner/repo', 'question')).rejects.toThrow('Request failed (500)');
  });

  it('throws a network-error message when fetch itself rejects', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(askQuestion('owner/repo', 'question')).rejects.toThrow(
      'Could not reach the Ask API'
    );
  });

  it('forwards an AbortSignal when provided in options', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ answer: '', files: [], model: '' }));
    const controller = new AbortController();

    await askQuestion('owner/repo', 'question', { signal: controller.signal });

    const [, init] = fetch.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });
});
