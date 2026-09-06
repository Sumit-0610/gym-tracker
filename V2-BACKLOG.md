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

## Workout features

- **Workout completion state** — `workouts.completed_at` + a "Finish" action, so
  history distinguishes finished from abandoned.
- **Resume current workout** — an endpoint for "my latest unfinished workout" so
  bare `/workout` can offer to resume (needs completion state above).
- **Previous performance** — while logging, show the last sets for this
  user + exercise (`ORDER BY date DESC LIMIT 1`).
- **Set types** — warmup / normal / dropset / failure (`workout_sets.set_type`;
  the schema was left room for this).
- **Rest timer** — frontend countdown between sets, no backend change.
- **1RM estimate** — Epley formula on the workout detail / exercise view.
- **Progress charts** — weight/volume over time per exercise (`GROUP BY` + a
  charting library — the first real UI dependency).
- **Unit preference** — kg/lb per user instead of the assumed kg.

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
