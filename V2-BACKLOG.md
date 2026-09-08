# Backlog

Candidates for future work. Each item is its own change with its own
verification. See `V1-STATUS.md` for what is deployed.

## Done

- ~~**Persistent session store**~~ — shipped in V2 (`server/src/session-store.js`,
  libSQL-backed). A restart no longer logs everyone out.
- ~~**HTTPS + `secure` cookie**~~ — shipped in V2. Render terminates TLS;
  `trust proxy` + `Secure; SameSite=Lax` cookie under `NODE_ENV=production`.
- ~~**Login rate limiting**~~ — shipped (`server/src/middleware/rate-limit.js`,
  `express-rate-limit`). 10 failed logins / 15 min / IP (successful logins not
  counted); 20 signups / hour / IP.
- ~~**Workout completion state**~~ — `workouts.completed_at`, `POST
  /api/workouts/:id/finish` (idempotent), history/detail show finished vs
  in-progress.
- ~~**Resume current workout**~~ — `GET /api/workouts/current`; Dashboard and
  `/workout` offer to resume the latest unfinished workout.
- ~~**Previous performance**~~ — `GET /api/exercises/:id/last-sets`; SetForm
  shows "Last time (<date>): …" for the chosen exercise.
- ~~**Set types**~~ — `workout_sets.set_type` (normal/warmup/dropset/failure),
  picker in SetForm, labelled in SetList.
- ~~**Rest timer**~~ — `RestTimer` component, auto-starts after each set,
  ±15s / Skip, duration in localStorage.
- ~~**Unit preference (kg/lb)**~~ — `users.weight_unit`, `PATCH /api/me`, new
  `/settings` screen. Weights stored in kg, converted at the edges
  (`format.js`).
- Idempotent `ALTER TABLE` migrations run on boot (`db.js`), so the schema
  columns above land on the existing database without data loss.
- ~~**Edit / delete workouts & sets**~~ — `PATCH`/`DELETE
  /api/workouts/:id/sets/:setId` (delete renumbers the remaining sets),
  `POST /api/workouts/:id/reopen`, `DELETE /api/workouts/:id` (cascade via a
  transaction). Inline edit + two-tap delete in `SetList`; reopen / delete on
  `WorkoutDetail`. `db.js` gained a `tx()` helper.
- ~~**History pagination**~~ — `GET /api/workouts?limit=&offset=` (bare-array
  response unchanged); History screen has a "Load more" button.
- ~~**Training volume**~~ — `GET /api/stats` (Σ reps×weight over 7/30/365 days +
  all time, workout counts). Shown per set / exercise / workout and on a new
  `/stats` screen.
- ~~**Rest-timer preference**~~ — `users.rest_seconds`; a stepper in `/settings`;
  the −15/+15 in the running timer now adjust the live countdown.
- ~~**Bigger exercise library**~~ — 21 → ~68; `seed.js` tops up by name on every
  boot.
- ~~**Finish celebration**~~ — 🎉 overlay with set count + volume after a workout.
- ~~**Icon edit/delete**~~ — pencil / trash with hover + a11y labels; delete asks
  "are you sure?".

## Infra / hosting

- **Custom domain** — currently on `gym-tracker-d5ha.onrender.com`.
  - **In progress: `gym-tracker.js.org`** — added in Render (Custom Domains,
    pending DNS). Blocked: js.org paused new subdomain requests until
    ~mid-Sept 2026. When it reopens: PR to `js-org/js.org` adding
    `"gym-tracker": "gym-tracker-d5ha.onrender.com"` to `cnames_active.js`
    (alphabetical order); on merge, DNS + Render TLS are automatic.
  - is-a.dev was tried and abandoned — their content policy ("software
    development related") is a poor fit for a workout app.
  - No code change either way.
- **PWA** — web-app manifest + a service worker so the app installs to the home
  screen and launches chrome-less. Pure frontend; the React code is unchanged.
  ~half a day. First real step toward "feels like an app".
- **Off-Render host** — only if the free tier's 15-min spin-down (mitigated today
  by the keep-alive ping) becomes a real annoyance. A card-free always-on host
  does not really exist; the alternatives are a paid VPS or accepting the cold
  start.

## Workout features (remaining)

- **1RM estimate** — Epley formula on the workout detail / exercise view.
- **Progress charts** — volume/weight *over time* per exercise, plotted (the
  `/stats` numbers are point-in-time totals; this is the graph). Needs a
  charting library — the first real UI dependency.

## Product (remaining)

- **Automated browser E2E** — Playwright against the deployment, replacing the
  manual `E2E-CHECKLIST.md` pass.

## Explicitly out of scope (do not add without a deliberate product decision)

Social features (likes / comments / following), wearable / smartwatch sync,
per-exercise video demonstrations.
