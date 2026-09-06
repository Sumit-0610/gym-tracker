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
- **Progress charts** — weight/volume over time per exercise (`GROUP BY` + a
  charting library — the first real UI dependency).

## Product

- **Workout / set editing and deletion** — only if a real need appears; adds
  `DELETE`/`PATCH` routes and undo semantics to think through.
- **History pagination** — `LIMIT`/`OFFSET` on `GET /api/workouts` once a user
  has hundreds of workouts.
- **Automated browser E2E** — Playwright against the deployment, replacing the
  manual `E2E-CHECKLIST.md` pass.

## Explicitly out of scope (do not add without a deliberate product decision)

Social features (likes / comments / following), wearable / smartwatch sync,
per-exercise video demonstrations.
