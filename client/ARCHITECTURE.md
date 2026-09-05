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
