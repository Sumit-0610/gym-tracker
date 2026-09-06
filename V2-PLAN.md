# V2 Plan — free cloud hosting (reachable from anywhere)

**Status:** planning. Not started. V1 on `main` stays frozen; all of this lands on
a `v2-cloud` branch.

**Goal:** Gym Tracker reachable at a public HTTPS URL from any device on any
network, at **zero cost and with no credit card**, changing as little of the V1
application as possible.

**Scope this round:** infrastructure lift only — get it running in the cloud.
Out of scope (stay in `V2-BACKLOG.md`): PWA / installable app, custom domain,
login rate limiting, workout-completion state, and every V2 *feature*.

**Decisions taken:**
- Fresh database — the phone's data is throwaway test records. No migration.
- Platform: **Koyeb** first choice, **Render** fallback (whichever is card-free
  at signup — verified in Phase 0).
- Database: **Turso** (managed libSQL — a SQLite fork). Free tier, GitHub login,
  no card.

---

## Target architecture

```
   any device, any network (phone on mobile data, someone else's laptop, …)
        │  https://gym-tracker.koyeb.app        (or *.onrender.com)
        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Koyeb / Render container   (HTTPS terminated by platform)   │
   │                                                             │
   │   Express                                                   │
   │    ├─ express.static('client/dist')  + SPA fallback   ← was nginx's job
   │    ├─ express-session  → libSQL-backed store          ← was MemoryStore
   │    └─ /api/*  → routers → business logic  (UNCHANGED)       │
   │                     │  await db.execute({ sql, args })      │
   └─────────────────────┼───────────────────────────────────────┘
                         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Turso  (cloud libSQL)   — the 6 tables, over the network    │
   └─────────────────────────────────────────────────────────────┘

   cron-job.org  ── GET / every 10 min ──▶  keeps the container awake
```

Nothing runs on hardware you own. The old phone becomes just another client (or
is switched off).

## What changes vs V1, and what does not

| Changes | Stays identical |
|---|---|
| `db.js` — `node:sqlite` → `@libsql/client` | every SQL query's **text** (libSQL is SQLite) |
| every `.get/.all/.run` call → `await db.execute(...)` | all business logic, route structure, status codes |
| route handlers → `async` (most already are) | `requireAuth`, ownership checks `WHERE … AND user_id = ?` |
| `seed.js` → `async` | `validation.js` (unchanged) |
| session store → libSQL-backed (was MemoryStore) | the entire React frontend, router, `api.js`, `useApi` |
| Express also serves `client/dist` + SPA fallback | the API contract (same request/response shapes) |
| cookie `secure: true`, `trust proxy` on | `smoke.sh` — same 65 assertions, must stay 65/65 |
| new `Dockerfile`, deploy config | `schema.sql` (still `CREATE TABLE IF NOT EXISTS`) |
| `HOST` defaults `0.0.0.0` on this branch (container needs it) | bcrypt hashing, auth flow |

**Files touched:** `server/src/db.js`, `server/src/seed.js`, the 4 route files in
`server/src/routes/`, `server/src/index.js`, `server/package.json`, plus new
`Dockerfile` / `.dockerignore` / `DEPLOYMENT-CLOUD.md`. The frontend is untouched.

---

## Phase 0 — Accounts & verification (operator, ~30 min)

**No code until this passes.** The whole free-no-card premise depends on it.

1. Sign up at **koyeb.com** with GitHub.
   - If it lets you create a service **without a payment method** → use Koyeb.
   - If it demands a card → sign up at **render.com** instead (confirmed
     card-free; 750 instance-hours/month = one always-on service).
   - If **both** demand a card → stop; the free-no-card cloud path is not
     available and the options are: accept a card (Google Cloud / Oracle
     always-free VM), or keep the phone + Cloudflare Tunnel.
2. Sign up at **turso.tech** with GitHub (no card). Create a database in the
   region closest to you. From the dashboard/CLI collect:
   - `TURSO_DATABASE_URL` (looks like `libsql://<name>-<org>.turso.io`)
   - `TURSO_AUTH_TOKEN` (a long token — **treat as a secret**, never commit)
3. Record which platform won and its default URL. Done.

**Deliverable:** a confirmed card-free platform account + Turso credentials held
by the operator (not pasted into chat, not committed).

---

## Phase 1 — Database driver swap (~half day)

Branch: `git checkout -b v2-cloud`

1. `server/package.json`: remove the `node:sqlite` usage, add
   `"@libsql/client": "^0.14"` (pin the actual current version at install).
   Relax `engines.node` (libSQL doesn't need 22.5) but keep `>=18`.
2. **`server/src/db.js`** — rewrite around one client:
   ```js
   const { createClient } = require('@libsql/client');
   const url = process.env.TURSO_DATABASE_URL || 'file:' + path.join(__dirname, '..', 'data', 'app.db');
   const authToken = process.env.TURSO_AUTH_TOKEN;               // undefined for file: URLs
   const db = createClient({ url, authToken });
   ```
   - Local dev and `smoke.sh` use the `file:` URL — **same client code path**, a
     plain local SQLite file, no Turso account needed to develop.
   - `init()` becomes async: `await db.executeMultiple(schemaText)` (libSQL runs
     a multi-statement script), then `await seed(db)`.
   - `PRAGMA foreign_keys = ON` — libSQL enables FKs by default; keep the pragma
     for parity, run it via `db.execute`.
3. **`server/src/seed.js`** → `async`; `await db.execute(...)` for the count
   check and the inserts. Still no-ops when `exercises` is non-empty.
4. **The 4 route files** — mechanical, one pattern:
   | V1 (`node:sqlite`) | V2 (`@libsql/client`) |
   |---|---|
   | `db.prepare(sql).get(a, b)` | `(await db.execute({ sql, args: [a, b] })).rows[0]` |
   | `db.prepare(sql).all(a)` | `(await db.execute({ sql, args: [a] })).rows` |
   | `db.prepare(sql).run(a, b)` | `await db.execute({ sql, args: [a, b] })` → `.lastInsertRowid`, `.rowsAffected` |
   - `lastInsertRowid` is a BigInt → `Number(...)` (same as V1).
   - Every handler that now `await`s a query must be `async` and keep its
     `try/catch → next(err)` (the auth routes already do this; add it to the
     others).
   - Rows come back as plain objects keyed by column name — same as V1's
     `.get()/.all()`. Aliased columns (`AS routine_name`, `AS set_count`) keep
     their alias. `COUNT(...)` returns a number.
5. **`server/src/index.js`**: `await db.init()` before `app.listen(...)` (wrap
   startup in an `async` IIFE); keep the "DB unreachable → exit loudly" behaviour.
6. Run `bash server/test/smoke.sh` against the local `file:` DB. **Gate: 65/65.**
   Fix any libSQL semantic differences here (date defaults, empty-result shape,
   error messages) — this is the phase where they surface.

Commit: `feat(server): swap node:sqlite for @libsql/client (v2-cloud)`

---

## Phase 2 — Production concerns (~2 hours)

1. **Persistent session store** (now mandatory — a container that scales to zero
   or redeploys would drop every MemoryStore session and log everyone out).
   - New table (added to `schema.sql`):
     ```sql
     CREATE TABLE IF NOT EXISTS sessions (
       sid    TEXT PRIMARY KEY,
       sess   TEXT NOT NULL,
       expire INTEGER NOT NULL          -- unix ms
     );
     ```
   - A ~40-line `express-session` `Store` subclass: `get` (fetch + JSON.parse +
     expiry check), `set` (upsert), `destroy` (delete), `touch` (update
     `expire`). A lazy sweep of expired rows on `set`.
   - First check whether a maintained `connect-*` store for libSQL exists; if
     not, the custom store is small and fully under our control.
2. **Express serves the frontend** (no nginx in the container), *after* the
   `/api` routers and *before* the error handler:
   ```js
   const dist = path.join(__dirname, '..', '..', 'client', 'dist');
   app.use(express.static(dist));
   app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
   ```
   This reproduces nginx's `try_files … /index.html` SPA fallback. `/api/*` is
   already handled above, so it never reaches the fallback.
3. **HTTPS cookie**: `app.set('trust proxy', 1)` (platform terminates TLS);
   session cookie `secure: true`, keep `httpOnly: true`, `sameSite: 'lax'`
   (frontend and API are the same origin now).
4. **`SESSION_SECRET`**: in production (`NODE_ENV === 'production'`) throw at
   startup if it's unset or equals the dev default. Dev keeps the fallback.
5. CORS: none — same origin.

Commit: `feat(server): libSQL session store + serve SPA + secure cookies`

---

## Phase 3 — Build & deploy config (~2 hours)

1. **`Dockerfile`** (multi-stage, repo root):
   ```dockerfile
   # ---- build the frontend ----
   FROM node:22-slim AS client
   WORKDIR /app/client
   COPY client/package*.json ./
   RUN npm ci
   COPY client/ ./
   RUN npm run build

   # ---- run the server ----
   FROM node:22-slim
   WORKDIR /app/server
   COPY server/package*.json ./
   RUN npm ci --omit=dev
   COPY server/ ./
   COPY --from=client /app/client/dist /app/client/dist
   ENV NODE_ENV=production HOST=0.0.0.0
   EXPOSE 3000
   CMD ["node", "src/index.js"]
   ```
2. **`.dockerignore`**: `node_modules`, `**/data`, `*.db*`, `.env`, `client/dist`
   (rebuilt in-image), `.git`.
3. **Platform service** (Koyeb or Render dashboard):
   - Source: the GitHub repo, `v2-cloud` branch (switch to `main` after merge),
     build method: Dockerfile.
   - Environment variables, set as **dashboard secrets** — never in git:
     `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
     `NODE_ENV` and `HOST` are baked into the image.
   - `PORT`: the platform injects it; `index.js` already reads `process.env.PORT`
     (add a `|| 3000` default if not already there).
   - Instance size: smallest / free.
4. First deploy → container boots → `db.init()` creates the schema in Turso →
   `seed.js` inserts the 21 exercises → `app.listen`.

Commit: `chore(deploy): Dockerfile + cloud deploy config`

---

## Phase 4 — Keep-alive (~20 min)

- The container sleeps after ~15 min with no requests → next visitor waits
  ~30–50 s (Render) / a few seconds (Koyeb) while it boots.
- **`cron-job.org`** (free, no repo, no account friction): a job hitting
  `GET https://<app>/` every 10 minutes. `/` returns the cheap `"hello"` string
  and does **not** touch the database.
- Fallback for the first hit after a deploy: a tiny inline loading state in
  `client/index.html` ("Starting up, one moment…") shown until the React bundle
  mounts. Static, served instantly, no framework.
- Note: GitHub Actions cron is an alternative but pauses after 60 days of repo
  inactivity — `cron-job.org` is steadier.

Commit: `chore(deploy): keep-alive ping + cold-start loading state`

---

## Phase 5 — Acceptance (~1 hour)

Run against the **live** deployment:

1. `BASE=https://<app> bash server/test/smoke.sh` → **65/65**. (Creates
   throwaway `user_<pid>_a/b` accounts — acceptable once; optionally add a
   cleanup or run against a Turso dev DB.)
2. `E2E-CHECKLIST.md` manually, in a phone browser **on mobile data with Wi-Fi
   off** — this is the proof of "reachable from anywhere / off my network".
3. Second-user isolation on the live site (B cannot see A's data → 404).
4. Refresh persistence — log in, hard-refresh, still authed (proves the session
   store works across requests).
5. Kill the container (redeploy) → log in again → data intact, sessions
   survive if still within expiry (proves the persistent store).
6. Time a cold start with the keep-alive disabled, then enabled.

Then: write `DEPLOYMENT-CLOUD.md` (the cloud runbook), update `V1-STATUS.md`
("Next milestone" → done) and `V2-BACKLOG.md` (tick the session-store and HTTPS
items), note the platform + observed cold-start numbers.

---

## Phase 6 — Cutover

1. Merge `v2-cloud` → `main` (V2 becomes the live line; V1 stays tagged).
2. Point the platform service at `main`.
3. Hand out the new URL to your ~10 users.
4. Switch the phone off (or keep it as a spare / offline-logging experiment
   later).

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Platform requires a card at signup | Phase 0 gate — try the other; if both, fall back to a card-VM or the phone. No code written until this clears. |
| libSQL behaves differently from `node:sqlite` (dates, empty results, transactions, BigInt) | `smoke.sh` at the end of Phase 1 is the net — all 65 checks must pass on libSQL before moving on |
| Turso free-tier limits (≈9 GB storage, ≈1 B row-reads/month) | ~10 users / dozens of workouts — nowhere near. Monitor in the dashboard. |
| Cold-start UX | keep-alive ping + static loading state (Phase 4) |
| Data now lives on a third party | accepted tradeoff for $0 always-on; `smoke.sh` + manual checks confirm integrity; Turso has its own backups; can export to a local file anytime with the same client |
| Free platform pauses/limits monthly hours | one service 24/7 fits Render's 750 hrs; Koyeb scale-to-zero + keep-alive fits its allowance. Re-check current limits at Phase 0. |

## Effort

~1.5 days of coding: `db.js` + `seed.js` + 4 route files (Phase 1, the bulk),
the session store + SPA serving (Phase 2), a Dockerfile (Phase 3). The frontend
is not touched this round.
