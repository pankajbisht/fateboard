# Backend: accounts, sync, sharing, AI proxy, remote MCP

Companion to [PLATFORMS.md](PLATFORMS.md) (Phase 5). Written 2026-11-14. Status: **plan, nothing built**.
Fateboard today has **no backend**: a static SPA on GitHub Pages, boards in the browser (`@/lib/storage`).
Owner decisions: Q15, Q16, Q18, Q19 in [DECISIONS.md](DECISIONS.md). Anything marked `UNKNOWN - verify` (vendor
limits, prices, store rules) must be checked against current docs before it is relied on.

## 1. Principles (these do not change with the vendor)

1. **Local-first.** Drawing, saving and opening never need the network or an account. The device copy (IndexedDB
   or a file) is the source of truth; the server is a sync peer and a sharing service. Offline is the normal
   case, not an error.
2. **The backend only does what a client cannot**: hold secrets (Claude API key), check identity, store data that
   must reach other devices or people, enforce quotas, serve public pages.
3. **Never lose a board** (the P0 data-safety rule, BUG-154 / 172 apply to the server too): a conflict keeps both
   versions, a failed upload stays queued and visible, every delete is soft first.
4. **One API contract we own.** Clients talk to *our* HTTP API with schemas in one shared module; the database,
   auth and storage vendors sit behind it, so they can be replaced without touching the editor.
5. **Same TypeScript everywhere**: one language for app and API, shared types, shared validation.
6. **Least privilege and privacy by default**: row-level access rules on every table, board content and AI
   prompts never written to logs, export and delete-my-account from day one.

## 2. What the backend does (and does not)

| Capability | Needs backend? | Phase |
|---|---|---|
| Draw, autosave, open / save files, templates, export | no (stays client-only) | today |
| Crash / error reporting | no: a SaaS (e.g. Sentry) receives it directly | Phase 0–1 |
| Desktop auto-update feed | no: a static JSON + signed files on GitHub Releases | Phase 3 |
| Accounts (sign in on every platform) | **yes** | 5a |
| AI features (Claude proxy, quotas) | **yes** (the key must stay server-side) | 5a |
| Cloud save / open, then automatic sync across devices | **yes** | 5b, 5c |
| Share links (read-only), public share pages with OG previews | **yes** | 5d |
| Real-time collaboration | **yes** (WebSocket rooms) | 5e, only if Q18 = yes |
| Remote MCP server for claude.ai and other MCP clients | **yes** | 5f |
| Payments / plans | **yes** (webhooks → entitlements) | 5g |

## 3. Recommended stack

| Piece | Pick | Why | Alternative |
|---|---|---|---|
| Auth, database, file storage | **Supabase** (managed: Auth, Postgres with Row Level Security, Storage) | one managed service covers the first three needs for a solo team; Postgres is a long-term safe choice; free tier to start | Firebase (NoSQL, more lock-in); self-hosted Postgres + an auth library (more ops) |
| API (our code) | **Hono** (TypeScript web framework) | tiny, Web-standard `Request` / `Response`, runs unchanged on Supabase Edge Functions (Deno), Cloudflare Workers, Node or Bun, so hosting can move without a rewrite | Fastify on Node (needs an always-on server) |
| API hosting, first | **Supabase Edge Functions** running the Hono app | one vendor while small | **Cloudflare Workers** when needed: longer streaming responses, global latency, or real-time rooms (`UNKNOWN - verify` Edge Function wall-clock limits against long AI streams) |
| Validation + shared types | **zod** schemas in one contract module, used by client and API | a request the client can build is a request the server accepts | JSON Schema + codegen |
| Database access in the API | SQL migrations in git (`supabase/migrations/`), a typed query layer (Supabase client or Drizzle) | migrations reviewed like code | Prisma |
| Real-time collaboration (only if Q18 = yes) | **Yjs** documents, rooms on **Cloudflare Durable Objects** (one object per board, WebSockets) | per-board state with strong ordering, scales to zero | Supabase Realtime broadcast carrying Yjs updates (`UNKNOWN - verify` fit); a hosted Yjs service |
| Large files (boards, images, exports) | Supabase Storage first; **Cloudflare R2** if download (egress) costs grow | R2 has no egress fees | S3 |
| Email (magic links, notices) | the auth provider's built-in sender first, a transactional email service at launch | deliverability | n/a |
| Payments | **Stripe** (web), app-store purchases on iOS / Android where store rules require them (`UNKNOWN - verify` current Apple / Google rules) | standard | Paddle / Lemon Squeezy (merchant of record handles tax) |

Why not "everything in one BaaS, no API of our own": AI calls, quotas, share pages and MCP need server logic and
secrets anyway, and an API we own keeps the client independent of the vendor (principle 4).

## 4. Architecture

```
 web / PWA        extension        desktop (Tauri)      iPad / Android (Tauri)
     │                │                  │                       │
     └──── src/lib/api (typed client: auth token, retries, offline queue) ─────┐
     └──── src/lib/sync (local-first sync engine)  ◀── @/lib/storage (device copy, source of truth)
                                    │ HTTPS (REST /v1, SSE for AI streams)       │ WebSocket (collab, 5e)
                                    ▼                                            ▼
                  ┌──────── our API: Hono app (apps/api) ────────┐    collab rooms: Durable Objects (Yjs)
                  │ auth check (verify the provider's JWT)       │
                  │ /v1/boards  /v1/sync  /v1/shares  /v1/ai/*   │──▶ Claude API (@anthropic-ai/sdk, key in env)
                  │ /v1/me (export, delete)  /mcp  /webhooks/*   │
                  └───────┬──────────────────────┬───────────────┘
                          ▼                      ▼
                 Postgres (RLS)            object storage
                 users, boards index,      board files (versioned), assets by
                 revisions, shares,        content hash, thumbnails
                 ai_usage, entitlements
```

### 4.1 Data model (first version)

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= auth user id), `display_name`, `created_at` | one row per account |
| `boards` | `id`, `owner_id`, `title`, `version` (int), `updated_at`, `size_bytes`, `thumbnail_path`, `deleted_at` | the index; the content lives in storage |
| `board_revisions` | `board_id`, `version`, `object_path`, `created_at`, `device_id` | keep the last N revisions: undo across devices, conflict recovery |
| `assets` | `hash` (sha-256), `owner_id`, `object_path`, `mime`, `size_bytes` | images stored once by hash (Q17: zip / assets format makes this natural) |
| `shares` | `token` (random, unguessable), `board_id`, `version` (pinned or latest), `expires_at`, `revoked_at` | read-only links |
| `ai_usage` | `user_id`, `day`, `input_tokens`, `output_tokens`, `requests` | quotas and cost tracking |
| `entitlements` | `user_id`, `plan`, `ai_quota`, `storage_quota`, `source` (stripe / apple / google) | written only by webhooks |

Every table has Row Level Security: a user reads and writes only rows where `owner_id = auth.uid()`; `shares`
are read through the API only. Storage paths start with the owner id and use signed URLs.

### 4.2 Sync (local-first, without a CRDT)

- Each board has a server `version`. The client keeps `{ boardId, baseVersion, dirty }` per board.
- **Push**: `PUT /v1/boards/:id` with `If-Match: <baseVersion>`. Match → new version stored, client updates
  `baseVersion`. Mismatch (`409`) → the client downloads the server copy and **keeps both**: the local one is
  renamed "… (conflict, <device>, <time>)". No silent overwrite, ever.
- **Pull**: on start, on focus and every few minutes, `GET /v1/sync?since=<cursor>` returns changed board ids and
  versions; download only what changed.
- **Queue**: failed pushes stay in an outbox in `@/lib/storage` and retry with backoff; the UI shows
  "Saved on this device · syncing / synced / offline / conflict" (a new `sync` slice, added with `fate-new-slice`).
- Assets upload by hash first (`HEAD` to skip what the server has), then the board JSON that references them.
- If Q18 (collaboration) is yes, boards that are shared for editing switch to Yjs documents; the version model
  above stays for personal boards and offline copies.

### 4.3 Auth on every platform

| Platform | Sign-in flow |
|---|---|
| web / PWA | provider redirect (OAuth with PKCE) or email magic link |
| extension | `chrome.identity.launchWebAuthFlow` (Firefox: `browser.identity`) with the extension's redirect URL |
| Tauri desktop / mobile | open the system browser, return through a deep link `fateboard://auth/callback` (PKCE); tokens kept in the OS keychain / keystore (`UNKNOWN - verify` the plugin that fits) |

This becomes `platform.auth.signIn()` / `signOut()` / `getToken()` in the platform port (PLATFORMS.md 3.1), so
the editor never sees which flow ran. Methods: email magic link + Google + Apple + GitHub. If an iOS app offers
third-party social sign-in, App Store guideline 4.8 asks for a privacy-focused option such as Sign in with Apple
(`UNKNOWN - verify` current wording). Owner decision **Q19**.

### 4.4 AI proxy

- `POST /v1/ai/:feature` (diagram, sketch-to-shapes, tidy, explain, alt-text). Auth required, quota checked in
  `ai_usage` before the call, streamed back as server-sent events.
- The API builds the Claude request (system prompt, tools generated from the command registry, PLATFORMS.md
  10.1), so clients cannot send arbitrary prompts with our key. Model `claude-opus-5-5` by default; per-feature
  cheaper models only after an eval (owner choice).
- Record token usage from the response, never the prompt or board content. Per-user and per-IP rate limits.
- Can ship **before** cloud sync: it needs only accounts and quotas.

### 4.5 Sharing and public pages

- `POST /v1/shares` creates a token; `https://<site>/s/<token>` is a read-only viewer.
- The share page is served by the API with real HTML: title, description, `og:image` (the board thumbnail
  uploaded by the client on save, so the server never runs Fabric). Run skill `fate-seo`; share pages are
  `noindex` unless the owner publishes the board to the gallery.
- Revoke = `revoked_at`; expired or revoked links return 404 HTML, not a broken app.

### 4.6 Remote MCP server

`/mcp` on the same API: Streamable HTTP transport, OAuth 2.1 for the MCP client to act as the user, the same
tools and diagram spec as the desktop MCP server (PLATFORMS.md 10.2), built with `@modelcontextprotocol/sdk`.
Every tool call goes through the same quota and RLS checks as the app.

## 5. API surface (v1)

```
GET    /v1/me                      profile, plan, quotas
GET    /v1/me/export               zip of every board and asset (GDPR export)
DELETE /v1/me                      delete account (soft, purge after N days)
GET    /v1/boards                  list (id, title, version, updated_at, thumbnail)
GET    /v1/boards/:id              board JSON (signed URL or body)
PUT    /v1/boards/:id              upload; If-Match: <version>; 409 on conflict
DELETE /v1/boards/:id              soft delete
GET    /v1/boards/:id/revisions    history
HEAD   /v1/assets/:hash · PUT /v1/assets/:hash
GET    /v1/sync?since=<cursor>     changed boards
POST   /v1/shares · DELETE /v1/shares/:token
POST   /v1/ai/:feature             SSE stream
POST   /webhooks/stripe            entitlements (signature checked)
GET|POST /mcp                      remote MCP (5f)
```

Conventions: JSON, zod-validated in and out, errors as `{ error: { code, message } }` with stable codes,
`/v1` prefix (breaking changes = `/v2`), idempotency keys on writes, request size limits, cursor pagination.

## 6. Repo layout once the backend exists

Adding a backend is the monorepo trigger in PLATFORMS.md section 9. Do the move as its own refactor first
(skill `fate-refactor`: move only, all checks green), then add the API.

```
fate/
├── apps/
│   ├── web/              today's app (src/, e2e/, public/, vite.config.ts)
│   ├── extension/        WXT (PLATFORMS.md Phase 2)
│   ├── native/           src-tauri (Phase 3–4)
│   └── api/              NEW: Hono app
│       ├── src/
│       │   ├── index.ts          app + route mounting
│       │   ├── routes/           boards.ts, sync.ts, shares.ts, ai.ts, me.ts, mcp.ts, webhooks.ts
│       │   ├── services/         storage, quotas, claude (SDK client), thumbnails
│       │   ├── db/               typed queries
│       │   └── middleware/       auth, rate limit, request id, error mapping
│       └── test/                 Vitest with app.request(), fake Claude client
├── packages/
│   ├── contract/         zod schemas + types for every endpoint (imported by web, extension, native, api)
│   └── diagram-spec/     shared by AI tools, MCP, templates (PLATFORMS.md 10.3)
├── supabase/             Supabase CLI project: config.toml, migrations/*.sql, RLS policies, seed.sql
└── docs/                 + BACKEND.md (this file)
```

Client side (in the web app): `src/lib/api/` (typed client from `packages/contract`), `src/lib/sync/` (engine,
outbox, conflict copies; pure logic, unit-tested), a `sync` slice, account UI in Settings. Network calls are
allowed on every platform (plain `fetch`); only sign-in goes through the platform port.

## 7. Environments, deploy, secrets

| Environment | Database / auth | API | Who deploys |
|---|---|---|---|
| local | Supabase CLI local stack (Docker) | `supabase functions serve` or `wrangler dev` | developer |
| preview | a separate Supabase project (or branching, `UNKNOWN - verify` plan) | preview deploy per PR | CI |
| production | production project, point-in-time backups on (`UNKNOWN - verify` plan) | deploy on merge to `main` after approval | CI, GitHub environment with required reviewers |

- Migrations: `supabase/migrations/` in git; CI applies them to preview on every PR and to production on
  release; never edit an applied migration.
- Secrets (`ANTHROPIC_API_KEY`, service-role key, Stripe keys) only in the provider's secret store and GitHub
  environment secrets. Never in the repo, never in a client bundle; the client only gets the public anon key
  and API URL (`VITE_API_URL`). The repo's guard hook already blocks `.env` edits.
- CORS allowlist: the site origin, the extension origins (`chrome-extension://<id>`, Firefox), Tauri origins
  (`tauri://localhost`, `http://tauri.localhost`); `connect-src` in the CSP (BUG-165) gets the API host.

## 8. Testing

| Layer | How |
|---|---|
| Contract | zod schemas tested once; client and API both import them, so drift is a type error |
| API routes | Vitest with Hono's `app.request()`; Claude replaced by a fake that streams canned events |
| Database rules | RLS tests against the local stack: user A can never read or write user B's rows (`UNKNOWN - verify` tool: pgTAP / `supabase test db`) |
| Sync engine | pure unit tests for every case: offline edits, 409 conflict keeps both, retry after failure, delete vs edit, two devices |
| End to end | Playwright against local stack: sign in, save to cloud, open on a second browser context, conflict copy appears |
| Load / cost | a script that replays N AI requests and checks quota enforcement |

## 9. Security and privacy checklist

- RLS on every table, checked by tests; the API uses the user's token, the service-role key only in webhooks
  and admin jobs.
- Validate every input (zod), cap sizes (board JSON, images, AI input), check content types, re-encode uploaded
  images or serve them with `Content-Disposition` and a safe `Content-Type`.
- Rate limits per user and per IP; quotas for AI and storage; abuse switch per user.
- Share tokens are long random values, revocable, never sequential ids.
- Logs: request id, route, status, latency, token counts. Never board content, prompts or full tokens.
- Account deletion and data export work before launch; a privacy policy says what is stored and where (region).
- Webhooks verify signatures; replayed events are idempotent.

## 10. Order of work (inside PLATFORMS.md Phase 5)

| Step | Delivers | Exit check |
|---|---|---|
| 5.0 | monorepo move (refactor only), `packages/contract`, `apps/api` skeleton with `/health`, Supabase project + first migration, CI deploy to preview | all existing checks green; preview API answers |
| 5a | accounts on web (then extension, Tauri) + **AI proxy** with quotas | sign-in works on each shipped platform; quota blocks request N+1 |
| 5b | cloud save / open (manual), board list in the app | save on web, open on desktop |
| 5c | automatic sync with outbox and conflict copies | sync engine tests + two-context E2E green |
| 5d | share links and public share pages | `fate-seo` audit clean on share pages; revoke works |
| 5e | real-time collaboration (only if Q18 = yes) | two users edit one board; offline edits merge |
| 5f | remote MCP | Claude client lists and creates boards for a signed-in user |
| 5g | plans and payments | webhook → entitlement → quota change, tested |

## 11. Cost (what grows the bill)

The first months fit free tiers (`UNKNOWN - verify` current limits). What grows with users: **AI tokens**
(by far the largest; quotas and prompt caching from day one), storage + download traffic (thumbnails small,
assets deduplicated by hash, R2 if egress grows), database size (revisions pruned). Track cost per active user
monthly; AI features are the reason a paid plan may be needed (Q16).

## 12. Working rules

1. Nothing in the editor may require the backend; every feature works signed out (AI and sharing show a
   sign-in prompt instead).
2. New endpoint = schema in `packages/contract` first, then route, then client; tests for each.
3. New table = migration + RLS policy + RLS test in the same change.
4. No secret in the client, ever; no vendor SDK in the editor except the auth flow behind the platform port.
5. Any change that can lose or overwrite a board needs a data-safety test (conflict, retry, delete) first.
6. Update this file when a step starts or ends or a `UNKNOWN - verify` is resolved.
