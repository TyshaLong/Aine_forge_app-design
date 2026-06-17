// Base URL of the Ask API (the Cloudflare Worker).
// - Production: set VITE_API_BASE at build time to the deployed Worker URL.
// - Local dev: leave it unset — Vite proxies /ask and /health to wrangler dev.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
