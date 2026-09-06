# Cloud deployment (Render + Turso) — V2

The V2 target: reachable from any network over HTTPS, $0, no credit card. The
Express app runs on Render's free tier; the database is Turso (hosted libSQL).
Nothing runs on your own hardware.

For the local phone/nginx deployment see `DEPLOYMENT.md` (V1 — still valid).

---

## Architecture

```
any device ──HTTPS──▶ https://gym-tracker.onrender.com
                         │  Render terminates TLS
                         ▼
                    Docker container (free instance)
                      Express: serves client/dist + /api/*
                         │  libSQL over the network
                         ▼
                    Turso (oregon)  — the 6 tables + sessions
```

Free-tier facts:
- The instance **spins down after ~15 min idle**; the next request triggers a
  ~30–50 s cold start. The `keep-alive` GitHub Action pings `/` every 10 min to
  prevent this.
- **No persistent disk** — which is why the database is Turso, not a file.
- ~750 instance-hours/month per Render workspace: enough for one always-on
  service.

---

## One-time setup

### 1. Turso database

Already done in planning. You need, from the Turso dashboard for your database:
- **URL** — `libsql://gym-tracker-<org>.turso.io`
- **auth token** — "Create Token" (keep it secret; it is not committed anywhere)

The schema and the 21 seed exercises are created automatically on first boot by
`server/src/db.js` → `init()`.

### 2. Render service

Option A — **Blueprint** (uses `render.yaml`):
1. Render dashboard → **New +** → **Blueprint** → pick the `gym-tracker` repo.
2. Render reads `render.yaml` and prompts for the two `sync: false` vars:
   - `TURSO_DATABASE_URL` = the Turso URL
   - `TURSO_AUTH_TOKEN` = the Turso token
   `SESSION_SECRET` is generated automatically; `NODE_ENV=production` is set.
3. **Apply** → Render builds the Dockerfile and deploys.

Option B — **manual**:
1. **New +** → **Web Service** → the `gym-tracker` repo.
2. Language/Runtime: **Docker**. Branch: `main`. Region: **Oregon**.
   Instance type: **Free**.
3. **Environment** → add:
   | key | value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `TURSO_DATABASE_URL` | `libsql://…turso.io` |
   | `TURSO_AUTH_TOKEN` | *(the secret token)* |
   | `SESSION_SECRET` | a long random string — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
4. Health check path: `/`.
5. **Create Web Service**.

First build takes a few minutes. When it's live, note the URL
(`https://gym-tracker-XXXX.onrender.com`).

### 3. Keep-alive

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables** →
   **New repository variable**: `APP_URL` = your Render URL (no trailing slash).
2. The `keep-alive` workflow runs every 10 min from then on. Trigger it once
   manually (**Actions → keep-alive → Run workflow**) to confirm it gets `200`.

If GitHub's scheduler runs too late and cold starts still happen, replace it
with a job on **cron-job.org** (free): `GET https://<app>/` every 5 min.

---

## Deploying an update

Render auto-deploys on every push to `main`. So:

```bash
git checkout main
git merge v2-cloud        # first time only
git push
```

Watch the deploy in Render's dashboard. The schema step is idempotent
(`CREATE TABLE IF NOT EXISTS`), so redeploys are safe. Sessions survive a
redeploy (they're in Turso now, not memory).

Roll back: Render dashboard → the service → **Deploys** → pick a previous
successful deploy → **Redeploy**.

---

## Local development (unchanged)

No Turso account needed. With `TURSO_DATABASE_URL` unset the app uses a local
file at `server/data/app.db`:

```bash
cd server && npm install && npm start          # API + serves client/dist if built
cd client && npm install && npm run dev        # or the Vite dev server on :5173
bash server/test/smoke.sh                        # 65/65
```

---

## Environment variables

| var | local dev | production (Render) | effect |
|---|---|---|---|
| `TURSO_DATABASE_URL` | unset → local file | **required** | the libSQL database to use |
| `TURSO_AUTH_TOKEN` | unset | **required** | authenticates to Turso |
| `SESSION_SECRET` | optional (dev default) | **required** — app refuses to boot without it | signs the session cookie |
| `NODE_ENV` | unset | `production` | enables `trust proxy` + `Secure` cookie |
| `PORT` | 3000 | injected by Render | listen port |
| `HOST` | `127.0.0.1` | `0.0.0.0` (set in the Dockerfile) | bind address |
| `DB_PATH` | optional | unused | local-file location override |
| `CLIENT_DIST` | optional | unused (default path is correct) | where the built frontend is |

No real secret value appears in this repo.

---

## Troubleshooting

| symptom | check |
|---|---|
| First visit is very slow (~40 s) then fine | cold start — confirm the keep-alive Action is green and `APP_URL` is set |
| Deploy fails at build | Render build logs — usually a client build error; reproduce with `cd client && npm ci && npm run build` |
| App boots then exits | Render logs — `SESSION_SECRET must be set` (add it) or a Turso connection error (check URL/token, and that the Turso DB isn't paused) |
| Logged out after every deploy | should NOT happen in V2 — means the `sessions` table isn't there; check the boot log shows schema applied |
| `/api/...` returns HTML | the static/SPA fallback caught it — should not happen (fallback skips `/api/`); check the route is registered |
| 500 on every API call | Render logs will show the error; most likely Turso auth/URL |
