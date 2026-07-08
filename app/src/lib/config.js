/**
 * config.js
 *
 * Central runtime configuration for the frontend.
 * All environment-specific values are resolved here so the rest of the
 * codebase never touches `import.meta.env` directly.
 */

/**
 * Base URL of the Ask API (the Cloudflare Worker).
 *
 * Resolution order:
 *  1. `VITE_API_BASE` build-time env var  →  used in production (GitHub Pages).
 *  2. Empty string fallback               →  Vite dev-server proxy forwards
 *                                            `/ask` and `/health` to wrangler dev
 *                                            on localhost:8787.
 *
 * Trailing slashes are stripped so callers can always write `${API_BASE}/ask`.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
