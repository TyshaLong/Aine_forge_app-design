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

### Health

- `GET /health` — `{ "ok": true }`

### User Profiles

Profiles are stored in-memory within the Worker isolate. For durable persistence
across restarts and data-centres, replace the in-memory `Map` in `src/index.js`
with Cloudflare KV or D1 calls.

**Profile schema**

| Field         | Type       | Description                                    |
|---------------|------------|------------------------------------------------|
| `username`    | `string`   | Unique identifier (set by the URL parameter)   |
| `displayName` | `string`   | Human-readable name                            |
| `email`       | `string`   | Contact e-mail (validated format)              |
| `bio`         | `string`   | Short biography                                |
| `repos`       | `string[]` | List of associated repository slugs            |
| `createdAt`   | `string`   | ISO 8601 timestamp — set on first write        |
| `updatedAt`   | `string`   | ISO 8601 timestamp — updated on every write    |

---

#### `GET /profiles/:username`

Retrieve a profile by username.

**Response `200`**
```json
{
  "profile": {
    "username": "tysha",
    "displayName": "Tysha Long",
    "email": "tysha@example.com",
    "bio": "Builder of things.",
    "repos": ["TyshaLong/advent-of-code-2025"],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Response `404`** — profile not found
```json
{ "error": "profile \"tysha\" not found" }
```

---

#### `PUT /profiles/:username`

Create or update a profile (upsert). All body fields are optional; only the
provided keys are written. Returns `201` on creation, `200` on update.

**Request body** (all fields optional)
```json
{
  "displayName": "Tysha Long",
  "email": "tysha@example.com",
  "bio": "Builder of things.",
  "repos": ["TyshaLong/advent-of-code-2025"]
}
```

**Response `201` / `200`**
```json
{
  "profile": {
    "username": "tysha",
    "displayName": "Tysha Long",
    "email": "tysha@example.com",
    "bio": "Builder of things.",
    "repos": ["TyshaLong/advent-of-code-2025"],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:05:00.000Z"
  }
}
```

**Response `400`** — validation error
```json
{ "error": "\"email\" must be a valid e-mail address or an empty string" }
```

---

#### `DELETE /profiles/:username`

Delete a profile by username.

**Response `200`**
```json
{ "deleted": true, "username": "tysha" }
```

**Response `404`** — profile not found
```json
{ "error": "profile \"tysha\" not found" }
```
