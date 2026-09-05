# Gym Tracker — V1 status

**V1 is complete and frozen.** Future work goes in a new milestone
(see `V2-BACKLOG.md`).

Repo: https://github.com/Sumit-0610/gym-tracker · frozen at the deployment commit
plus this audit.

---

## What is complete

### Backend
Express 4 + `node:sqlite`, raw parameterized SQL, 6 tables, `bcryptjs` hashing,
`express-session` cookie sessions. 13 endpoints (auth, exercises, routines,
workouts, sets, history). `requireAuth` middleware; every user-owned query
filters `WHERE … AND user_id = ?`; not-found ≡ not-owned (both 404). Generic
error responses (no stack traces / SQL). Config hooks: `PORT`, `HOST`
(default loopback), `DB_PATH`, `SESSION_SECRET`.

### Frontend
React 19 + Vite. 2 runtime deps (react, react-dom). Custom History-API router
(no react-router), React Context for auth (no Redux), hand-written CSS +
design tokens (no UI framework). Single `api.js` layer, `useApi` hook, auth state
always re-derived from `GET /api/me` (never `localStorage`). 10 screens covering
the full journey: signup/login → dashboard → exercises (search) → routines
(create / detail / add exercise) → workout (routine + freestyle, log sets) →
history (list + detail). Production build ~67 KB gzip JS.

### Deployment
`DEPLOYMENT.md` runbook for Termux + nginx. `deploy/`: nginx server block
(SPA fallback + `/api` → `127.0.0.1:3000`, port 8080), `nginx.conf.example`,
`start.sh`, `backup.sh` (SQLite online `.backup`, keeps 14), `health-check.sh`.
`server/.env.example`.

### Testing
- `server/test/smoke.sh` — 65 automated checks (API contract + two-user
  authorization + DB-level verification of denied writes).
- `E2E-CHECKLIST.md` — reproducible manual browser checklist.
- No automated browser E2E framework (intentional — see limitations).

### Security
- Express binds `127.0.0.1` only; nginx (:8080) is the sole network-facing entry.
- Session cookie: `httpOnly`, `sameSite=lax`, `secure=false` (correct for
  HTTP-on-LAN — no HTTPS in this deployment).
- Passwords stored as bcrypt (`$2a$`, 60 chars) — never plaintext.
- Ownership enforced in SQL; cross-user access returns 404.
- Logout destroys the session.
- No secrets in git; `.env`, `*.db`, `node_modules`, `*.log`, `client/dist/`
  all gitignored.

---

## What was verified

### In the development environment (this audit)
| Area | Result |
|---|---|
| Backend smoke suite | **65/65** |
| Production build | succeeds, ~67 KB gzip JS, no warnings |
| Full browser journey (desktop + 375px + 320px mobile viewport) | passed (Phase 11f) |
| nginx behaviour, reproduced with `vite preview` on the real `dist/` | SPA deep links `/history/5`, `/routines/9` → 200 index.html; `/assets/*.js` → real file; `/api/me` → 401 JSON (proxied, **not** fallen through to index.html) |
| Session round-trip through the proxy | signup → `Set-Cookie: connect.sid=…; HttpOnly; SameSite=Lax` → `/api/me` with cookie → 200 → … → logout → 401 |
| Second-user isolation | B cannot read A's routine / workout / history (all 404); B's set injection into A's workout → 404, A's data unchanged; A retains full access |
| Data persistence across backend restart | routine + workout + set (10 reps × 42.5 kg) survive `kill` → restart; re-login → data intact |
| MemoryStore behaviour on restart | old session cookie → 401 after restart (documented, not data loss) |
| Backend stopped | `/api` → connection refused (fails clearly); restart restores |
| DB path unwritable at startup | node exits with a clear `SQLITE_CANTOPEN` / `EACCES` error — does not start broken |
| `DB_PATH` override | creates its directory, seeds, works; default unchanged |
| Backup mechanism | `sqlite3 .backup` produces a valid readable copy **while the server runs** |
| `HOST=127.0.0.1` bind | confirmed |
| git tree | clean, no runtime state committed |

### On the real phone (operator-run)
Claude Code has no access to the phone. The on-device acceptance test —
Android browser → real nginx → node → SQLite, the 21-step flow in
`DEPLOYMENT.md §13` including the second-user isolation check and the
`kill node → restart → data persists` check — is run by the operator and its
results recorded by them. This document does not claim phone results it did not
observe.

Operator: record the actuals here after running `DEPLOYMENT.md §13`:

| | observed value |
|---|---|
| phone Node version | `node -v` = … (expected ≥ 22.5; Termux currently ships v26.x) |
| `node:sqlite` on phone | works / fails |
| nginx status | running on :8080 |
| Express bind / port | `127.0.0.1:3000` |
| database location | `~/gym-tracker-data/app.db` (or your `DB_PATH`) |
| browser used | … |
| LAN access | `http://<phone-ip>:8080` from another device: yes / no |
| `deploy/health-check.sh` | HEALTHY / UNHEALTHY |
| full §13 journey | pass / fail |
| second-user isolation on device | pass / fail |
| restart → data persists | pass / fail |

---

## What remains intentionally unimplemented (V1 limitations)

1. **MemoryStore sessions** — a backend restart logs everyone out. Data is safe
   in SQLite; users log in again.
2. **No HTTPS** in this LAN deployment. `secure=false` cookies are correct here.
3. **No "resume last workout"** from bare `/workout` — recover an active workout
   by its URL (`/workout/:id`).
4. **No explicit workout completion state** — a workout is just a row; "Finish"
   navigates away; any workout reopens at `/workout/:id`.
5. **Weight assumed kilograms** — no unit setting; `0` shows as "bodyweight".
6. **Dates** stored UTC, shown in the viewer's local timezone; no per-user tz.
7. **No history pagination** — fine at ~10 users / dozens of workouts.
8. **No automated browser E2E framework** — `E2E-CHECKLIST.md` is the manual
   pass; `smoke.sh` locks the API contract.

These are deliberate V1 boundaries, not bugs. See `V2-BACKLOG.md` for the
candidates that would address them.

---

## Next milestone

**V2 only.** No speculative dates. Scope to be decided from `V2-BACKLOG.md`;
each item is its own change with its own verification. V1 code
(schema, API contracts, auth, frontend architecture, router, API layer, workout
and history flows) is **frozen** — changes to any of it belong in V2, not as
patches to V1.
