# Forge Ask — API proxy (Cloudflare Worker)

Holds the API keys server-side and answers questions about a GitHub repo:
a request comes in → the worker reads relevant files via the GitHub API →
Claude (`claude-opus-4-8`) answers with context, then returns the answer plus
the list of files it read.

## Deploy

```bash
cd worker
npm install
npx wrangler login                       # one-time, opens a browser
npx wrangler secret put ANTHROPIC_API_KEY # paste your Anthropic API key
npx wrangler secret put GITHUB_TOKEN      # optional: higher GitHub limits / private repos
npx wrangler deploy
```

`wrangler deploy` prints the public URL, e.g.
`https://forge-ask-api.<your-subdomain>.workers.dev`.

## Point the frontend at it

Set `VITE_API_BASE` to that URL for the app build:

- **Local dev:** create `app/.env.local` with `VITE_API_BASE=http://localhost:8787`
  and run `npx wrangler dev` in this folder alongside `npm run dev` in `app/`.
- **GitHub Pages:** add a repo **variable** named `VITE_API_BASE` (Settings →
  Secrets and variables → Actions → Variables) set to the deployed Worker URL.
  The deploy workflow passes it into the build.

## Local development

```bash
npm install
npx wrangler dev   # serves on http://localhost:8787
```

The Vite dev server proxies `/ask` and `/health` to `http://localhost:8787`,
so the app works locally without setting `VITE_API_BASE`.

## Endpoints

- `POST /ask` — body `{ "repo": "owner/name", "question": "..." }` →
  `{ "answer": "...", "files": ["path/a", "path/b"] }`
- `GET /health` — `{ "ok": true }`
