# V2 backlog

Candidates for a future milestone. **Nothing here is implemented or committed to.**
V1 is frozen (see `V1-STATUS.md`). Each item would be its own change with its own
verification.

## Data / session hardening

- **Persistent session store** — a SQLite-backed `express-session` store so a
  backend restart no longer logs everyone out. Small, self-contained; no route
  changes.
- **HTTPS** — only if the app is ever exposed beyond the LAN. Requires a
  certificate (self-signed or Let's Encrypt via a tunnel) and flipping the
  session cookie to `secure: true` + `sameSite: 'strict'`.
- **Login rate limiting** — the nginx `limit_req` snippet is already documented
  (commented) in `deploy/nginx-gym-tracker.conf`; enabling it is a config change,
  not code.

## Workout improvements

- **Workout completion state** — a `completed_at` column + a "Finish" action, so
  history can distinguish finished from abandoned workouts.
- **Resume current workout** — an endpoint for "my latest unfinished workout" so
  bare `/workout` can offer to resume instead of always showing the start screen.
- **Previous performance** — while logging, show the last sets for this
  user + exercise (`ORDER BY date DESC LIMIT 1`).
- **Set types** — warmup / normal / dropset / failure (`workout_sets.set_type`;
  the schema was left room for this).
- **Rest timer** — pure frontend countdown between sets, no backend change.
- **1RM estimate** — Epley formula on the workout detail / exercise view.
- **Progress charts** — weight/volume over time per exercise (`GROUP BY` +
  a charting lib).
- **Unit preference** — kg/lb per user instead of the assumed kg.

## Product improvements

- **Workout / set editing and deletion** — only if a real need appears; adds
  `DELETE`/`PATCH` routes and undo semantics to think through.
- **History pagination** — `LIMIT`/`OFFSET` on `GET /api/workouts` once a user
  has hundreds of workouts.

## Explicitly out of scope (do not add without a deliberate product decision)

Social features (likes/comments/following), wearable/smartwatch sync, per-exercise
video demonstrations.
