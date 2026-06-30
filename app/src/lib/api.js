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

// ── User Profile API ──────────────────────────────────────────────────────────
//
// Profile schema (all fields except `username` are optional on PUT):
//   { username, displayName, email, bio, repos, createdAt, updatedAt }

/**
 * Fetch a user profile by username.
 * Returns the profile object on success; throws on error.
 *
 * @param {string} username
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ username: string, displayName: string, email: string, bio: string, repos: string[], createdAt: string, updatedAt: string }>}
 */
export async function getProfile(username, { signal } = {}) {
  if (!username) throw new Error('username is required');

  let res;
  try {
    res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the Profiles API. ${API_BASE ? `(${API_BASE})` : 'The backend URL is not configured (VITE_API_BASE).'}`
    );
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data.profile;
}

/**
 * Create or update a user profile (upsert).
 * All payload fields are optional — only the provided keys are written.
 * Returns the resulting profile object.
 *
 * @param {string} username
 * @param {{ displayName?: string, email?: string, bio?: string, repos?: string[] }} fields
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ username: string, displayName: string, email: string, bio: string, repos: string[], createdAt: string, updatedAt: string }>}
 */
export async function upsertProfile(username, fields = {}, { signal } = {}) {
  if (!username) throw new Error('username is required');

  let res;
  try {
    res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      signal,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the Profiles API. ${API_BASE ? `(${API_BASE})` : 'The backend URL is not configured (VITE_API_BASE).'}`
    );
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data.profile;
}

/**
 * Delete a user profile by username.
 * Returns { deleted: true, username } on success; throws on error.
 *
 * @param {string} username
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ deleted: boolean, username: string }>}
 */
export async function deleteProfile(username, { signal } = {}) {
  if (!username) throw new Error('username is required');

  let res;
  try {
    res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the Profiles API. ${API_BASE ? `(${API_BASE})` : 'The backend URL is not configured (VITE_API_BASE).'}`
    );
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}
