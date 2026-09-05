# Frontend architecture

React + Vite, deliberately minimal. This file records *why*, so the decisions
don't get silently reverted later.

## Why React (not vanilla JS)

Evaluated against this project's goals (a learning project; ~10 users; runs on a
phone via nginx):

- **"Component architecture" is an explicit learning goal.** You can't really
  learn it in vanilla — you learn its absence. React teaches it directly.
- **The hardest part of a vanilla frontend is keeping the DOM in sync with data**
  after every change. React's `state → re-render` model removes that entire bug
  class, and understanding *why* that matters is the point.
- **The workout-logging screen is genuinely stateful** (a growing set list, a
  resetting form, buttons disabling mid-request). This is where vanilla hurts
  most and React helps most.
- **Build cost is not a phone cost.** `npm run build` runs on the dev machine and
  emits static files in `dist/`. nginx serves those. The phone runs zero
  frontend tooling.

## What we deliberately DON'T use

| Not using | Instead | Why |
|---|---|---|
| react-router | `src/router.jsx` (~90 lines, History API) | one concept to learn, zero deps, enough for ~10 static routes |
| Redux / Zustand / etc. | React Context for auth, `useState` for the rest | nothing here needs a store |
| a UI component library | hand-written CSS + `styles/tokens.css` | consistency matters more than quantity; smaller bundle |
| TypeScript | plain JSX | the backend chose JS; keep one language |
| an icon library | text labels / inline SVG | avoid a dependency + bytes |

If the custom router or Context genuinely starts to hurt, swap in the standard
library **with a concrete reason** — don't pre-empt it.

## Folder map

```
src/
  main.jsx        entry — mounts <App> into #root
  App.jsx         <Router> + <AuthProvider> + the route table + the shell
  api.js          the ONLY place that calls the backend. request() + ApiError +
                  one named helper per endpoint
  auth.jsx        AuthContext / AuthProvider (GET /api/me on load) / useAuth()
  router.jsx      History-API router: <Router>, <Link>, useNavigate(), <Redirect>
  hooks/useApi.js the { data, error, loading, reload } triad for GET screens
  components/      reusable presentational pieces (Button, Input, Card, …)
  pages/           one file per screen; each owns a .css beside it
  styles/          tokens.css (design variables) + global.css (reset)
```

## Auth state — how a refresh keeps you logged in

The session cookie is `httpOnly`, so JavaScript can't read it. The frontend
therefore never *assumes* auth state — it asks the server:

```
app loads → AuthProvider calls GET /api/me (cookie sent automatically by browser)
          → 200 {user}  → status 'authenticated'
          → 401         → status 'anonymous'
```

Because this runs on every load, a refresh just re-runs the check. Nothing
sensitive is stored client-side. `localStorage` is not used for auth at all.

## API communication

```
event → (optional) frontend validation for UX
      → api.something() → fetch(path, {credentials:'same-origin'})
      → Vite proxy (dev) / nginx (prod) → Express :3000
      → requireAuth (session cookie) → parameterized, ownership-filtered SQL
      → JSON → ApiError? (branch on .status, never on message text)
      → setState → re-render → DOM
```

Everything is **same-origin** in both dev (Vite `server.proxy`) and prod (nginx),
so `sameSite: 'lax'` genuinely protects against CSRF and no CSRF token library
is needed at this scope. Revisit only if the frontend ever becomes cross-origin.

## Page conventions (established in 11c, reused in later screens)

- **Server data vs derived data.** A screen holds the raw API response in state
  (via `useApi`) and computes anything else with `useMemo` on each render
  (e.g. `filtered = exercises + searchTerm`). Derived values are never stored in
  their own `useState` — two copies of the same fact drift apart.
- **Four async states, not three.** A list screen distinguishes: loading /
  request failed / request OK but empty / request OK but the *filter* matched
  nothing. The last two get different messages.
- **After a mutation, re-fetch — don't patch local state.** `useApi` returns
  `reload()`; forms call it via an `onCreated` / `onAdded` callback prop. The
  server stays the single source of truth; no client cache.
- **Double-submit guard is local.** Each write form keeps `const inFlight =
  useRef(false)` and returns early while a request is running. A ref (not state)
  because it must take effect synchronously, before React re-renders the
  disabled button. No global concurrency machinery.
- **Forms use `noValidate`.** We render our own validation messages (consistent
  styling, matches the API's error copy); native constraint bubbles are
  suppressed. `min`/`type` attributes stay as hints.
- **`<select>` is native.** On a phone the OS picker beats anything custom.

## Intent vs confirmed server state (11d)

The active workout screen (`/workout/:id`) never shows a set because a button was
clicked. The flow is: submit → `POST /api/workouts/:id/sets` → **the server
confirms the row exists** → `workout.reload()` re-fetches → the set renders from
`GET /api/workouts/:id`. A failed request leaves the screen showing exactly what
the server has, with an error — the set is never faked into the list.

- **Set number is derived, not typed.** `nextSetNumber = sets.filter(s =>
  s.exercise_id === chosen).length + 1`, recomputed each render. Client sends it
  explicitly (the backend requires it); it advances on its own after each logged
  set and resets per exercise.
- **The workout id is in the URL.** `/workout/:id` means a mid-workout refresh
  reloads the session from the existing `GET /api/workouts/:id`. The route was
  already in the table; no backend change. Limitation: no "resume last workout"
  from bare `/workout` (no endpoint for it) — documented in the README.
- **`ExerciseSelect`** (grouped-by-muscle `<select>`) was extracted from the 11c
  routine builder so 11d's set form reuses it — genuine two-call-site reuse, not
  speculative componentization.

## History is a pure read (11e)

`/history` and `/history/:id` issue only `GET /api/workouts` and
`GET /api/workouts/:id`. No mutations, no new endpoints. A history page can
re-fetch freely (it's a query — idempotent, no side effect), unlike set logging.

- **Server ordering is authoritative.** `GET /api/workouts` returns newest-first
  (`date DESC, id DESC`); `History` renders the array as-is with no client sort.
  Re-implementing the sort in React would be a second copy of a rule that can
  drift from the backend's.
- **Flat API, grouped display.** `GET /api/workouts/:id` returns a flat
  `sets[]` (ordered by set id = log order). `SetList` groups it by exercise
  *for rendering only*, recomputed each render — never stored. The backend stays
  a clean relational list; "group by exercise" is one of several possible views
  and belongs in the component that needs it.
- **URL carries the state.** `/history/7` holds everything needed:
  `WorkoutDetail` parses `7`, calls `GET /api/workouts/7`, renders from the
  response. Nothing depends on prior React state, so a hard refresh is identical
  to a normal navigation. (Contrast 11d: an active workout's *unsent* form input
  is not in the URL and is lost on refresh.)
- **Dates: stored UTC, shown local.** `formatDate` in `src/format.js` appends
  `Z` to the backend's `"YYYY-MM-DD HH:MM:SS"` and calls `toLocaleString`, so
  the time shown follows the viewer's device. No per-user timezone setting in
  v1; the stored value is never modified. (`WorkoutSession` still has its own
  local `formatStarted` — candidate to consolidate onto `formatDate` in 11f.)
- **Empty workout ≠ error.** V1 has no "finish" state, so a workout row with
  zero sets is valid data. `WorkoutDetail` shows "No sets logged", not an error.

## Dev workflow

```bash
# terminal 1 — API
cd server && npm start                 # http://localhost:3000

# terminal 2 — frontend with hot reload
cd client && npm run dev               # http://localhost:5173  (proxies /api → :3000)
```

## Production build

```bash
cd client && npm run build             # → client/dist/  (static files only)
```

nginx serves `client/dist/` and proxies `/api/` to `127.0.0.1:3000`. Because
routing is client-side, nginx needs `try_files $uri /index.html;` so a deep link
like `/history/4` loads the app. (Full nginx config comes in Phase 12.)
