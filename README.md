# Gym Tracker

Self-hosted gym workout tracker (login + routines + workout logging), inspired by Hevy.
Learning project — small scale (~10 users), clarity over scalability.

## Stack

- **Backend:** Node.js + Express (`server/`)
- **Database:** SQLite via `node:sqlite` (built into Node 22.5+ — no native addon to compile)
- **Auth:** `bcryptjs` password hashing + `express-session` cookie sessions
- **Frontend:** React + Vite (`client/`) — see `client/ARCHITECTURE.md`
- **Reverse proxy (on the phone):** nginx serves `client/dist/` + proxies `/api` → Express

## Requirements

- Node **≥ 22.5** (the app checks this). Termux: `pkg install nodejs` gives a new enough version.

## Run the server (development)

```bash
cd server
npm install
npm run dev      # auto-restarts on file changes
# or: npm start
```

API listens on `http://localhost:3000` (override with `PORT`).
The SQLite file is created at `server/data/app.db` on first run.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Express listen port |
| `SESSION_SECRET` | dev placeholder | **set a real random value in production** |

## Build order / status

See `../CLAUDE_CODE_START_HERE.md` for the full plan. Current progress:

- [x] Phase 1 — Express skeleton
- [x] Phase 2 — SQLite connection + schema
- [x] Phase 3 — Signup (bcrypt)
- [x] Phase 4 — Login + sessions
- [x] Phase 5 — Auth middleware + protected route
- [x] Phase 7 — Exercises API
- [x] Phase 8 — Routines API
- [x] Phase 9 — Workout logging
- [x] Phase 10 — Workout history
- [~] Phase 11 — Frontend (React + Vite)
  - [x] 11a — foundation: router, API client, auth context, design system
  - [x] 11b — auth UI: login, signup, logout, refresh-persistent session
  - [x] 11c — exercises browser (search) + routines (list, create, detail, add exercise)
  - [ ] 11d — workout logging
  - [ ] 11e — history
  - [ ] 11f — polish + tests
- [ ] Phase 12 — Deploy config for the phone

**Backend v1 is complete.** All 65 checks in `server/test/smoke.sh` pass.

## Run it (development)

```bash
cd server && npm install && npm start      # terminal 1 — API on :3000
cd client && npm install && npm run dev     # terminal 2 — UI on :5173 (proxies /api)
```

Open http://localhost:5173.

## API (v1)

Every route except `/api/signup` and `/api/login` requires a session cookie.
Errors are always `{ "error": "<message>" }`.

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/api/signup` | `{username, password}` | `201 {id, username}` |
| POST | `/api/login` | `{username, password}` | `200 {id, username}` |
| POST | `/api/logout` | — | `200 {ok:true}` |
| GET | `/api/me` | — | `200 {id, username, created_at}` |
| GET | `/api/exercises` | — | `200 [{id, name, muscle_group}]` |
| POST | `/api/routines` | `{name}` | `201 {id, name}` |
| GET | `/api/routines` | — | `200 [{id, name}]` |
| GET | `/api/routines/:id` | — | `200 {id, name, exercises:[…]}` |
| POST | `/api/routines/:id/exercises` | `{exercise_id, target_sets?, target_reps?}` | `201 {id, routine_id, …}` |
| POST | `/api/workouts` | `{routine_id?}` | `201 {id, routine_id, date}` |
| POST | `/api/workouts/:id/sets` | `{exercise_id, set_number, reps, weight}` | `201 {id, workout_id, …}` |
| GET | `/api/workouts` | — | `200 [{id, date, routine_name, set_count}]` |
| GET | `/api/workouts/:id` | — | `200 {id, date, routine_id, routine_name, sets:[…]}` |

## Tests

```bash
cd server
npm start                # terminal 1
rm -f data/app.db        # optional: start from an empty DB
bash test/smoke.sh       # terminal 2 — exits 0 if all checks pass
```

## Deploying to the phone

See `deploy/` (added in Phase 12).
