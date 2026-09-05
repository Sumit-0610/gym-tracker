# Gym Tracker

Self-hosted gym workout tracker (login → routines → workout logging → history),
inspired by Hevy. Learning project — small scale (~10 users), clarity over
scalability. **V1 is complete** (backend + frontend).

## Stack

- **Backend:** Node.js + Express (`server/`), raw parameterized SQL
- **Database:** SQLite via `node:sqlite` (built into Node 22.5+ — no native addon)
- **Auth:** `bcryptjs` hashing + `express-session` cookie sessions (httpOnly, sameSite=lax)
- **Frontend:** React 19 + Vite (`client/`) — custom ~90-line router, no other
  runtime deps; see `client/ARCHITECTURE.md`
- **Reverse proxy (on the phone, Phase 12):** nginx serves `client/dist/` and
  proxies `/api` → Express

## Requirements

- Node **≥ 22.5**. Termux: `pkg install nodejs` is new enough.

## Run it (development)

```bash
cd server && npm install && npm start      # terminal 1 — API on :3000
cd client && npm install && npm run dev    # terminal 2 — UI on :5173 (proxies /api → :3000)
```

Open **http://localhost:5173**. The SQLite file is created at `server/data/app.db`
on first run.

| Env var | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Express listen port |
| `SESSION_SECRET` | dev placeholder | **set a real random value in production** |

## Production build (frontend)

```bash
cd client && npm run build      # -> client/dist/  (static files only, ~67 KB gzip JS)
```

nginx serves `client/dist/` and needs `try_files $uri /index.html;` so client-side
routes deep-link (full nginx config: Phase 12).

## Application flow

```
sign up / log in
  → dashboard  (Start a workout)
  → exercises  (browse + search the 21-exercise library)
  → routines   (create; open; add exercises with target sets/reps)
  → start workout  → follow a routine  OR  freestyle
  → log sets   (reps + weight; set number auto-increments per exercise)
  → history    (newest first; routine name or "Freestyle"; set count)
  → workout detail  (sets grouped by exercise)
  → log out
```

## API (v1)

Every route except `/api/signup` and `/api/login` requires the session cookie.
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

Client routes: `/login` `/signup` `/` `/exercises` `/routines` `/routines/:id`
`/workout` `/workout/:id` `/history` `/history/:id`.

## Tests

```bash
# backend contract + two-user authorization (65 checks)
cd server && npm start           # terminal 1
bash test/smoke.sh               # terminal 2 — exits 0 if all pass

# frontend: reproducible manual checklist
E2E-CHECKLIST.md
```

## Known V1 limitations

- **Sessions are in-memory** (`express-session` default store) — restarting the
  API logs everyone out. A SQLite-backed store is a later addition.
- **No "resume last workout."** An active workout is recovered by URL
  (`/workout/:id` → `GET /api/workouts/:id`); landing on bare `/workout` after a
  refresh shows the start screen. No endpoint for "the current unfinished
  workout"; logged sets are always safe in the DB.
- **No explicit workout completion.** A workout is just a row; "Finish workout"
  navigates away. Any workout can be reopened at `/workout/:id`.
- **Weight is assumed kilograms.** No unit setting. `0` displays as "bodyweight".
- **Dates: stored UTC, shown in the viewer's local timezone.** No per-user tz.
- **No pagination** on history — fine at this scale.
- **No automated browser E2E framework** — `E2E-CHECKLIST.md` is a manual
  checklist; `smoke.sh` locks the API contract.

## Deploying to the phone

Phase 12 (nginx config + transfer) — not built yet.
