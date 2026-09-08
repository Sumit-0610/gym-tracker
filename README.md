# Gym Tracker

A self-hosted gym workout tracker (sign up → routines → log workouts → history,
stats, calendar, bodyweight), inspired by Hevy. A learning project — small scale
(~10 users), clarity over scale, minimal dependencies.

**Live:** https://gym-tracker-d5ha.onrender.com

## Stack

- **Backend** (`server/`) — Node.js + Express 4, raw parameterized SQL, no ORM.
  `bcryptjs` password hashing, `express-session` cookie sessions (`httpOnly`,
  `SameSite=Lax`, `Secure` in prod) with a small libSQL-backed session store.
  `express-rate-limit` on the auth routes, `helmet` security headers.
- **Database** — SQLite via **libSQL** (`@libsql/client`). Local dev / tests use
  a plain file (`server/data/app.db`); production points at a hosted **Turso**
  database with the same client.
- **Frontend** (`client/`) — React 19 + Vite. Two runtime deps (`react`,
  `react-dom`). A custom ~90-line History-API router, React Context for auth,
  hand-written CSS with design tokens. No TypeScript (JSDoc + `tsc --checkJs`
  for type-checking). See `client/ARCHITECTURE.md`.
- **Deployment** — a Docker image on Render's free tier; Express serves the built
  frontend (single origin, no proxy). See `DEPLOYMENT-CLOUD.md`.

## Run it locally

```bash
cd server && npm install && npm start      # API on :3000, also serves client/dist if built
cd client && npm install && npm run dev     # UI on :5173, proxies /api -> :3000
```

Open **http://localhost:5173**. No configuration needed — the SQLite file is
created at `server/data/app.db` on first run. To run the whole app from one
process like production: `cd client && npm run build`, then open
**http://localhost:3000**.

### Environment

Everything works unset for local dev. See `server/.env.example`.

| Var | Local default | Notes |
|---|---|---|
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | unset → local file | set both to use a Turso database instead |
| `DB_PATH` | `server/data/app.db` | local file location (ignored when Turso is set) |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | the host injects `PORT`; set `HOST=0.0.0.0` in a container |
| `SESSION_SECRET` | dev placeholder | **required** when `NODE_ENV=production` (boot fails otherwise) |
| `TZ` | system | production sets `Asia/Kolkata` — all date bucketing uses it (single-timezone assumption; see `V1-STATUS.md`) |

## Checks

```bash
cd server && npm run check         # eslint + tsc --checkJs + prettier + node:test unit tests
node src/index.js & npm run test:smoke   # 161-check API + two-user-authz integration test

cd client && npm run check         # eslint + tsc --checkJs + prettier + vitest + build
```

CI (`.github/workflows/ci.yml`) runs all of the above on every push and PR to
`main`. `E2E-CHECKLIST.md` is the manual browser pass.

## Application flow

```
sign up / log in
  → home        profile header (workouts, streak), weekly activity chart, dashboard grid
  → workout     follow a routine or freestyle → log sets (reps, weight, set type)
                → rest timer between sets → Finish (🎉) → history
  → history     paginated list; open one → sets grouped by exercise, edit/delete,
                reopen or delete the workout
  → stats       total volume over 7 / 30 / 365 days + all time
  → calendar    training days over the last 3 months, streak
  → measures    bodyweight log with a trend sparkline
  → settings    kg/lb unit, rest-timer default
```

## API

Session cookie required except for `/api/signup` and `/api/login`. All errors are
`{ "error": "<message>" }`. Full request/response shapes are in the route files
under `server/src/routes/`.

| Area | Routes |
|---|---|
| auth | `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `PATCH /api/me` |
| exercises | `GET /api/exercises`, `GET /api/exercises/:id/last-sets` |
| routines | `GET/POST /api/routines`, `GET /api/routines/:id`, `POST /api/routines/:id/exercises` |
| workouts | `POST /api/workouts`, `GET /api/workouts?limit=&offset=`, `GET /api/workouts/current`, `GET /api/workouts/:id`, `POST .../finish`, `POST .../reopen`, `DELETE /api/workouts/:id`, `POST .../sets`, `PATCH/DELETE .../sets/:setId` |
| stats | `GET /api/stats`, `GET /api/stats/weekly`, `GET /api/stats/calendar` |
| measurements | `GET/POST /api/measurements`, `DELETE /api/measurements/:id` |

## Documentation

| File | What |
|---|---|
| `V1-STATUS.md` | what's built and verified; timezone assumption; still-open items |
| `V2-BACKLOG.md` | candidate future work, with rationale |
| `DEPLOYMENT-CLOUD.md` | the Render + Turso runbook |
| `client/ARCHITECTURE.md` | why React, the state model, the custom router |
| `E2E-CHECKLIST.md` | manual browser test checklist |
| `GYM_TRACKER_V1_TECHNICAL_GUIDE.pdf` | a deep first-principles walkthrough — **documents the frozen V1** (Termux + nginx + node:sqlite); the app has since moved to Render + Turso and gained the V2 features |
| `docs/historical/` | the superseded V1 phone deployment (Termux + nginx) |
