/**
 * api.js
 *
 * HTTP client for the Forge Ask API (Cloudflare Worker).
 * Exposes a single public function: `askQuestion`.
 */

import { API_BASE } from './config.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ask a natural-language question about a GitHub repository.
 *
 * @param {string} repo      - Repository in "owner/name" format.
 * @param {string} question  - The question to ask.
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal] - Optional AbortController signal for
 *   cancellation (e.g. when the component unmounts mid-request).
 *
 * @returns {Promise<{ answer: string, files: string[], model: string }>}
 * @throws  {Error} with a user-readable message on network or API failure.
 */
export async function askQuestion(repo, question, { signal } = {}) {
  // --- Phase 1: Send the request ---
  let res;
  try {
    res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, question }),
      signal,
    });
  } catch (networkError) {
    throw new Error(buildNetworkErrorMessage());
  }

  // --- Phase 2: Parse the response body ---
  // Always attempt JSON parsing; the body may contain a structured error even
  // when the status code is non-2xx.
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. a plain-text gateway error) — data stays null.
  }

  // --- Phase 3: Validate the status code ---
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds a human-readable error message for network-level failures (i.e. the
 * fetch itself threw before a response was received).
 *
 * @returns {string}
 */
function buildNetworkErrorMessage() {
  if (API_BASE) {
    return `Could not reach the Ask API. (${API_BASE})`;
  }
  return 'Could not reach the Ask API. The backend URL is not configured (VITE_API_BASE).';
}
