/**
 * repos.js
 *
 * Static registry of GitHub repositories available for querying in the app.
 *
 * To add a new repository, append an entry to `REPOS` — no other changes are
 * needed. The `repoUrl` helper derives the GitHub URL from any `full` value,
 * falling back gracefully for repos not in the registry.
 */

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Repo
 * @property {string}  short    - Short display label shown in the sidebar.
 * @property {string}  full     - Full "owner/name" identifier used as the API
 *                                `repo` parameter and for GitHub URL construction.
 * @property {string}  url      - Canonical GitHub URL for the repository.
 * @property {boolean} indexed  - Whether the repo has been indexed and is ready
 *                                to answer questions.
 */

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** @type {Repo[]} */
export const REPOS = [
  {
    short: 'advent-of-code-2025',
    full: 'TyshaLong/advent-of-code-2025',
    url: 'https://github.com/TyshaLong/advent-of-code-2025',
    indexed: true,
  },
  {
    short: 'karlhadwen/todoist',
    full: 'karlhadwen/todoist',
    url: 'https://github.com/karlhadwen/todoist',
    indexed: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the GitHub URL for a repository.
 *
 * Looks up the registry first so the stored `url` is used when available.
 * Falls back to constructing `https://github.com/{full}` for any repo not in
 * the registry (e.g. a user-added repo that isn't in the static list).
 *
 * @param {string} full - Repository identifier in "owner/name" format.
 * @returns {string} Full GitHub URL.
 */
export function repoUrl(full) {
  const match = REPOS.find((r) => r.full === full);
  return match ? match.url : `https://github.com/${full}`;
}
