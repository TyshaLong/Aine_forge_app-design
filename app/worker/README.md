# Forge Ask — API proxy (Cloudflare Worker + Workers AI)

Answers questions about a GitHub repo, for free. A request comes in → the worker
picks the most relevant repo files via the GitHub API → a free Llama model on
**Cloudflare Workers AI** answers with that context. Returns the answer plus the
files it used.

No Anthropic key, no per-question bill — usage runs against Cloudflare's free
daily Workers AI allowance.

## Deploy

```bash
cd worker
npm install
npx wrangler login                    # one-time, opens a browser
npx wrangler secret put GITHUB_TOKEN  # optional: higher GitHub limits / private repos
npx wrangler deploy
```

`wrangler deploy` prints the public URL, e.g.
`https://forge-ask-api.<your-subdomain>.workers.dev`. The `[ai]` binding in
`wrangler.toml` enables Workers AI automatically — nothing else to configure.

## Point the frontend at it

Set `VITE_API_BASE` to that URL for the app build:

- **Local dev:** create `app/.env.local` with `VITE_API_BASE=http://localhost:8787`
  and run `npx wrangler dev` here alongside `npm run dev` in `app/`.
- **GitHub Pages:** add a repo **variable** named `VITE_API_BASE` (Settings →
  Secrets and variables → Actions → Variables) set to the deployed Worker URL.
  The deploy workflow passes it into the build.

## Local development

```bash
npm install
npx wrangler dev   # serves on http://localhost:8787; Workers AI runs on Cloudflare
```

The Vite dev server proxies `/ask`, `/health`, and `/profiles` to
`http://localhost:8787`.

## Model / cost

- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (edit `MODEL` in `src/index.js`).
- Cost: free within Cloudflare's daily Workers AI allowance; past that it's a small
  per-request charge (see Cloudflare's Workers AI pricing). Answer quality is good
  but below Claude — to upgrade later, swap the `env.AI.run(...)` call for the
  Anthropic API.

## Endpoints

### Ask

- `POST /ask` — body `{ "repo": "owner/name", "question": "..." }` →
  `{ "answer": "...", "files": ["path/a"], "model": "Llama 3.3 70B" }`
- `GET /health` — `{ "ok": true }`

### User Profiles

Profile schema: `{ id, username, email, repos, createdAt }`

> **Note:** Profiles are stored in-memory inside the Worker isolate and reset on
> each new deployment or cold start. For persistence, replace the `profiles` Map
> with a [Cloudflare KV](https://developers.cloudflare.com/kv/) or
> [D1](https://developers.cloudflare.com/d1/) binding.

| Method   | Path              | Request body                              | Response                    |
|----------|-------------------|-------------------------------------------|-----------------------------|
| `GET`    | `/profiles`       | —                                         | `{ profiles: Profile[] }`   |
| `POST`   | `/profiles`       | `{ username, email, repos? }`             | `Profile` (201)             |
| `GET`    | `/profiles/:id`   | —                                         | `Profile`                   |
| `PUT`    | `/profiles/:id`   | `{ username?, email?, repos? }`           | `Profile`                   |
| `DELETE` | `/profiles/:id`   | —                                         | `{ ok: true }`              |

#### Validation rules

- `username` and `email` are required on `POST`; neither may be empty on `PUT`.
- `email` must match a basic RFC-5322 pattern (`user@domain.tld`).
- `username` and `email` must be unique across all profiles (HTTP 409 on conflict).
- `repos` is an optional array of `"owner/name"` strings; defaults to `[]`.

#### Example — create a profile

```bash
curl -X POST https://forge-ask-api.<subdomain>.workers.dev/profiles \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com","repos":["TyshaLong/advent-of-code-2025"]}'
```

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "email": "alice@example.com",
  "repos": ["TyshaLong/advent-of-code-2025"],
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### Example — update a profile

```bash
curl -X PUT https://forge-ask-api.<subdomain>.workers.dev/profiles/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Content-Type: application/json' \
  -d '{"repos":["TyshaLong/advent-of-code-2025","karlhadwen/todoist"]}'
```

#### Error responses

All errors return `{ "error": "<message>" }` with an appropriate HTTP status:

| Status | Condition                                      |
|--------|------------------------------------------------|
| 400    | Missing / invalid field in request body        |
| 404    | Profile ID not found                           |
| 405    | Wrong HTTP method for the path                 |
| 409    | `username` or `email` already registered       |
