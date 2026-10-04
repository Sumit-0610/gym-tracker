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
- ~~**Home page (Hevy-style)**~~ — profile header (workouts + streak, no
  followers/following), weekly `ActivityChart` (volume/reps/sets), a dashboard
  tile grid. `GET /api/stats` gained `workout_count` + `week_streak`;
  `GET /api/stats/weekly`.
- ~~**Calendar**~~ — `/calendar`, `GET /api/stats/calendar`; last 3 months,
  training days marked with the workout label.
- ~~**Bodyweight log**~~ — `/measures`, `measurements` table + routes; add
  (upsert by day), sparkline, deletable history.

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

- ~~**1RM estimate**~~ and ~~**progress charts**~~ — shipped with the coach
  engine: `GET /api/exercises/:id/progress`, `/exercises/:id` page (Epley
  estimate, PRs, hand-drawn SVG trend — no charting library needed).

### Coach engine (rules-based, no LLM) — shipped

- ~~Next-set suggestion~~ (double progression, `GET /api/exercises/:id/suggestion`),
  ~~PR detection~~ (`GET /api/workouts/:id/prs`, live 🏆 badges + the finish
  celebration), ~~stall nudge~~, ~~weekly sets per muscle~~
  (`GET /api/stats/muscles`), ~~"suggested routine today"~~
  (`GET /api/routines/recommend`), ~~typo guard~~ (client `coach.js`), optional
  per-set **RPE**, and a per-set `created_at`.
- **Warm-up sets no longer count** toward volume, set totals or records
  (behaviour change).

### AI roadmap

- ~~**AI coach recap**~~ — after a finished workout, Gemini narrates the facts
  the coach engine computed (PRs, stalls, weekly sets per muscle) in 3–5
  sentences. Opt-in per user (`users.ai_enabled`, Settings), no username or ids
  sent, cached per workout in `ai_recaps` (regenerated if the sets change),
  rate-limited. `server/src/ai.js` is the only provider call;
  `server/src/coach-recap.js` builds the facts. Needs `GEMINI_API_KEY`.
- Weekly recap and routine generator, reusing `ai.js`.
- Copy-history-to-ChatGPT/Claude button.
- Natural-language / voice set entry ("bench 80 for 5, 5, 4").
- Deferred: phone rep-counting, photo calorie estimation.

## Engineering (remaining)

- **Automated browser E2E** — Playwright against the deployment, replacing the
  manual `E2E-CHECKLIST.md` pass.
- **Widen `checkJs`** — `tsc --noEmit` currently type-checks only the client
  logic modules (`format.js`, `api.js`, hooks, `setGrouping.js`); the JSX
  component/page files take untyped props. Add per-component JSDoc `@typedef`
  and include them.
- **CI on Windows** — CI runs Ubuntu only; `smoke.sh` and the `node --test`
  glob have Windows quirks worked around locally. A Windows job would catch
  regressions there.

## Product (remaining)

- **Per-user timezone** — today all date bucketing (calendar day, week, streak,
  "last N days") uses one server timezone (`TZ=Asia/Kolkata`); correct only
  because every user is in that zone. To support other zones: add
  `users.timezone` (IANA), send it (or the client's offset) to the stats /
  calendar / measurements endpoints, and replace SQLite `localtime` with an
  explicit offset. See the "Timezone" note in `V1-STATUS.md`.

## Explicitly out of scope (do not add without a deliberate product decision)

Social features (likes / comments / following), wearable / smartwatch sync,
per-exercise video demonstrations.
