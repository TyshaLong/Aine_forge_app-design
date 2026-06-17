import { API_BASE } from './config.js';

// Ask a question about a repo. Returns { answer, files }.
export async function askQuestion(repo, question, { signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, question }),
      signal,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the Ask API. ${API_BASE ? `(${API_BASE})` : 'The backend URL is not configured (VITE_API_BASE).'}`
    );
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}
