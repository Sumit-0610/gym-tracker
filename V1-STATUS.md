# Gym Tracker — V1 status

**V1 is complete, frozen, and deployed.** It runs on the target Android/Termux
device behind nginx and was verified end-to-end on that device on 2026-09-06
(details below).

**V2 (cloud hosting) is now live** — same app, reachable from any network at
`https://gym-tracker-d5ha.onrender.com`. See "Next milestone" below and
`DEPLOYMENT-CLOUD.md`.

Repo: https://github.com/Sumit-0610/gym-tracker

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

### On the real phone (operator-run, 2026-09-06)

Deployed and verified on the target device by the operator, guided step by step.
Claude Code has no phone access; the values below are the operator's actual
observations.

| | observed value |
|---|---|
| Termux | 0.119.0-beta.3 |
| phone Node / npm | **v26.4.0** / 12.0.2 |
| git / nginx | 2.55.0 / **1.31.5** |
| `node:sqlite` on phone | **works** — `DatabaseSync, StatementSync, Session, constants, backup` |
| Express bind / port | **`127.0.0.1:3000`** — confirmed not reachable on the LAN IP (`http://192.168.31.200:3000` → connection refused) |
| nginx | **running on :8080**, gym-tracker config (`nginx -t` passes) |
| database location | `/data/data/com.termux/files/home/gym-tracker-data/app.db` — 36 KB, `0600`, outside the git clone |
| browser used | Chrome (Android) |
| LAN access | **yes** — `http://192.168.31.200:8080` from another device on the same Wi-Fi loads and is fully usable |
| `deploy/health-check.sh` | **HEALTHY** — every layer (node, nginx, DB, Express direct, frontend, SPA fallback, /api proxy, session round-trip through nginx) |
| full acceptance journey (`DEPLOYMENT.md §13`) | **pass** — signup, login, refresh-persistent auth, exercises + case-insensitive search + no-match state, routine create/detail/add-exercise, routine workout, freestyle workout (no fake routine), set logging incl. weight 0 → "bodyweight", active workout recovered from history, history list + workout detail grouped by exercise, logout, login again |
| deep links + nav | **pass** — hard-refresh on `/history/<n>` and `/routines/<n>`; browser back/forward; unknown URL → "Not found" page (not an nginx 404) |
| second-user isolation on device | **pass** — user B: `routines` `[]`, `workouts` `[]`, `GET /api/routines/1` → 404, `GET /api/workouts/1` → 404, `POST /api/workouts/1/sets` → 404 |
| restart → data persists | **pass** — workout count identical before/after `pkill node` + restart; sessions reset (documented MemoryStore behaviour) |
| backup | **pass** — `deploy/backup.sh` → valid readable `app-<ts>.db` (3 users, 2 workouts) |

**Deployment fixes found on-device** (deploy-only, no app code):
- `e540ba1` — `nginx.conf.example` hard-coded `pid .../var/run/nginx.pid`; this
  Termux build compiles `--pid-path=$PREFIX/tmp/nginx_pid`. Removed all explicit
  log/pid paths — nginx uses its compiled defaults.
- `9a23929` — `health-check.sh` used `pgrep -x nginx`, which never matches
  because nginx renames its processes to `nginx: master process …`. Now matches
  `nginx: master`.

**Operational note (a real limitation of phone-as-server, not a bug):** during a
long screen-off pause, Android killed Termux entirely (it relaunched fresh),
even with `termux-wake-lock`. Enabling Termux → *Allow background activity* and
*notifications* reduces this. It is reliable while the app is actively in use
(screen on). For unattended 24/7 availability, host the backend off the phone
(V2 — see `V2-BACKLOG.md`).

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

### V2 — cloud hosting: DONE (2026-09-06)

The V1 application logic is unchanged; V2 was an infrastructure move so the app
is reachable from **any network** over HTTPS at no cost.

- **Host:** Render free tier (Docker web service, Oregon). Spins down after
  ~15 min idle; a GitHub Actions `keep-alive` workflow pings `/healthz` every
  10 min. URL: `https://gym-tracker-d5ha.onrender.com`.
- **Database:** Turso (hosted libSQL, Oregon). `node:sqlite` → `@libsql/client`;
  local dev/tests still use a plain file (`url: file:...`) with no account.
- **Sessions:** persistent libSQL-backed `express-session` store (new `sessions`
  table) — logins now survive a restart, which V1's MemoryStore did not.
- **Frontend:** served by Express itself (`express.static` + SPA fallback) —
  there is no nginx in the cloud deployment.
- **HTTPS:** Render terminates TLS; `trust proxy` + `Secure` session cookie when
  `NODE_ENV=production`; the app refuses to boot in production without a real
  `SESSION_SECRET`.
- **Verified against the live deployment:** `server/test/smoke.sh` 65/65
  (full API contract + two-user authorization); signup → authenticated call →
  write → read-back through Render's TLS; `Set-Cookie` carries
  `HttpOnly; Secure; SameSite=Lax`.

Runbook: `DEPLOYMENT-CLOUD.md`. Plan/rationale: `V2-PLAN.md`. The V1 phone +
nginx deployment (`DEPLOYMENT.md`) remains valid and documented.

### Still open (see `V2-BACKLOG.md`)

- Custom domain (a `*.onrender.com` URL is in use).
- Installable **PWA** (manifest + service worker) — deliberately deferred from
  the infra round.
- Login rate limiting; workout-completion state; and the remaining feature
  items.
