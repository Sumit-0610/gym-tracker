# Gym Tracker

Self-hosted gym workout tracker (login + routines + workout logging), inspired by Hevy.
Learning project — small scale (~10 users), clarity over scalability.

## Stack

- **Backend:** Node.js + Express (`server/`)
- **Database:** SQLite via `node:sqlite` (built into Node 22.5+ — no native addon to compile)
- **Auth:** `bcryptjs` password hashing + `express-session` cookie sessions
- **Frontend:** React + Vite (`client/`) — *not built yet*
- **Reverse proxy (on the phone):** nginx in front of the Express app

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
- [ ] Phase 7 — Exercises API
- [ ] Phase 8 — Routines API
- [ ] Phase 9 — Workout logging
- [ ] Phase 10 — Workout history
- [ ] Phase 11 — React client
- [ ] Phase 12 — Deploy config for the phone

## Deploying to the phone

See `deploy/` (added in Phase 12).
