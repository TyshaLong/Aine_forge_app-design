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
// Profile schema: { id, username, email, repos, createdAt }
//
// All functions throw an Error with a human-readable message on failure,
// matching the same contract as askQuestion so callers can surface errors
// directly in the UI.

async function profileRequest(method, path, body, { signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

/**
 * Fetch all user profiles.
 * @returns {Promise<{ profiles: Profile[] }>}
 */
export function getProfiles({ signal } = {}) {
  return profileRequest('GET', '/profiles', undefined, { signal });
}

/**
 * Fetch a single user profile by ID.
 * @param {string} id
 * @returns {Promise<Profile>}
 */
export function getProfile(id, { signal } = {}) {
  return profileRequest('GET', `/profiles/${encodeURIComponent(id)}`, undefined, { signal });
}

/**
 * Create a new user profile.
 * @param {{ username: string, email: string, repos?: string[] }} profileData
 * @returns {Promise<Profile>}
 */
export function createProfile(profileData, { signal } = {}) {
  return profileRequest('POST', '/profiles', profileData, { signal });
}

/**
 * Update an existing user profile (partial update — only supplied fields change).
 * @param {string} id
 * @param {{ username?: string, email?: string, repos?: string[] }} updates
 * @returns {Promise<Profile>}
 */
export function updateProfile(id, updates, { signal } = {}) {
  return profileRequest('PUT', `/profiles/${encodeURIComponent(id)}`, updates, { signal });
}

/**
 * Delete a user profile by ID.
 * @param {string} id
 * @returns {Promise<{ ok: true }>}
 */
export function deleteProfile(id, { signal } = {}) {
  return profileRequest('DELETE', `/profiles/${encodeURIComponent(id)}`, undefined, { signal });
}
