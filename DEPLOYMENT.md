# Deploying Gym Tracker on an Android phone (Termux + nginx)

This is the runbook for putting the finished V1 app on the phone. Claude Code
does **not** run on the phone — you run these commands yourself in Termux.

```
Phone browser  ──▶  nginx :8080  ──▶  Express :3000 (127.0.0.1 only)  ──▶  SQLite
                     serves client/dist/                                  server/data or DB_PATH
                     proxies /api/* 
```

- **Frontend:** static files, built once (`client/dist/`), served by nginx.
- **Backend:** one `node` process, loopback-only. nginx is the sole entry point.
- **Database:** one SQLite file. The only irreplaceable thing — back it up.

---

## 1. Prerequisites (on the phone, once)

```bash
pkg update && pkg upgrade
pkg install nodejs git nginx
termux-setup-storage        # lets backups reach /sdcard if you want
```

Check Node is new enough for the built-in SQLite (needs ≥ 22.5):

```bash
node -v                                  # expect v22.5+ (Termux currently ships v26)
node -e "require('node:sqlite'); console.log('node:sqlite OK')"
```

If `node:sqlite` errors, stop — do **not** swap in a native SQLite package; get a
newer Node first (`pkg upgrade nodejs`).

Keep the process alive across screen-off:

```bash
termux-wake-lock
```

and in Android: **Settings → Apps → Termux → Battery → Unrestricted**.

---

## 2. First-time setup

```bash
cd ~
git clone https://github.com/Sumit-0610/gym-tracker.git
cd gym-tracker

# --- backend deps (production only) ---
cd server
npm ci --omit=dev            # installs express, express-session, bcryptjs

# --- config: keep the DB outside the code tree ---
mkdir -p ~/gym-tracker-data
cp .env.example .env
nano .env                    # set the values below, then Ctrl-O, Ctrl-X
```

`server/.env` — the important lines:

```ini
PORT=3000
HOST=127.0.0.1
DB_PATH=/data/data/com.termux/files/home/gym-tracker-data/app.db
SESSION_SECRET=<paste output of: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

> `DB_PATH` points **outside** `~/gym-tracker` so a `git pull` — or even deleting
> and re-cloning the repo — can never touch your data.

```bash
# --- build the frontend (one time, and after every update) ---
cd ../client
npm ci                       # dev deps needed only to build
npm run build                # -> client/dist/   (Vite is not needed after this)
```

---

## 3. Configure nginx

The repo ships two files in `deploy/`:

| File | Use |
|---|---|
| `deploy/nginx.conf.example` | the **whole** `nginx.conf` — use this if you have no nginx setup you care about |
| `deploy/nginx-gym-tracker.conf` | just the `server { }` block — `include` it into an existing `nginx.conf` |

Simplest path (the stock Termux `nginx.conf` is just a placeholder site — safe to
replace):

```bash
cp $PREFIX/etc/nginx/nginx.conf $PREFIX/etc/nginx/nginx.conf.orig   # keep a copy
cp ~/gym-tracker/deploy/nginx.conf.example $PREFIX/etc/nginx/nginx.conf
nginx -t                     # must say "syntax is ok" / "test is successful"
nginx -s reload              # if already running; otherwise: nginx
```

`$PREFIX` is `/data/data/com.termux/files/usr`. If you cloned the repo somewhere
other than `~/gym-tracker`, edit the `root` line in `nginx-gym-tracker.conf` to
point at `<your repo>/client/dist`.

`nginx.conf.example` deliberately sets **no** `error_log` / `pid` / `access_log`
paths — nginx uses its compiled-in defaults, which are the ones the Termux
package already creates. (Hard-coding them risks a path this build doesn't use;
check yours with `nginx -V 2>&1 | tr ' ' '\n' | grep -E 'log-path|pid-path'`.)

What the config does:
- `location /api/` → proxies to `http://127.0.0.1:3000` (matched first, never falls through)
- `location /assets/` → serves the hashed build files, cached hard
- `location /` → `try_files $uri $uri/ /index.html` — the **SPA fallback**, so
  `/history/5` loads the app instead of a 404
- `index.html` is sent `Cache-Control: no-store` so an update is picked up immediately

Cookies pass straight through — same host, HTTP, `SameSite=Lax`, so no cookie
rewriting and no `secure` flag.

---

## 4. Start the backend

```bash
cd ~/gym-tracker
./deploy/start.sh
```

It sources `server/.env`, checks `node:sqlite`, prints the config, and runs
`npm start`. First run creates the DB and seeds 21 exercises.

To keep it running after you close Termux:

```bash
cd ~/gym-tracker
nohup ./deploy/start.sh > ~/gym-tracker.log 2>&1 &
```

(`~/gym-tracker.log` is git-ignored via `*.log`.) Stop it with:

```bash
pkill -f 'node .*src/index.js'
```

---

## 5. Access the app

- **Same phone:** open `http://localhost:8080` in the phone's browser.
- **Another device on the same Wi-Fi:** find the phone's LAN IP —
  `ip addr show wlan0 | grep 'inet '` (e.g. `192.168.1.42`) — then open
  `http://192.168.1.42:8080` on that device.

Only nginx's port **8080** is on the LAN. Express (**3000**) is bound to
`127.0.0.1` and is not reachable from other devices. Do **not** set up port
forwarding — this is a LAN-only deployment with no HTTPS.

---

## 6. Health check

```bash
cd ~/gym-tracker
./deploy/health-check.sh
```

Verifies: node + nginx running · DB file exists and is writable · Express answers
directly · nginx serves the frontend · SPA fallback works · `/api` is proxied
(not fallen through) · a signup→`/api/me` session round-trip succeeds through nginx.
Prints `HEALTHY` / `UNHEALTHY`.

---

## 7. Restarting

```bash
pkill -f 'node .*src/index.js'          # stop backend
cd ~/gym-tracker && ./deploy/start.sh   # start again
```

**Expected after a backend restart:** everyone is logged out and must log in
again. That is the documented MemoryStore behaviour — **it is not data loss**.
All routines, workouts and sets are safe in SQLite. nginx keeps running the
whole time; `/api` calls just get a `502` for the few seconds node is down.

nginx itself rarely needs restarting: `nginx -s reload` (after a config change),
`nginx -s stop` then `nginx` (full restart).

---

## 8. Updating to a new version

```bash
cd ~/gym-tracker
./deploy/backup.sh                      # 1. always back up the DB first

git pull                               # 2. get the new code

cd server && npm ci --omit=dev         # 3. only if server/package.json changed
cd ../client && npm ci && npm run build # 4. rebuild the frontend

pkill -f 'node .*src/index.js'          # 5. restart the backend
cd .. && nohup ./deploy/start.sh > ~/gym-tracker.log 2>&1 &

nginx -s reload                        # 6. only if you changed nginx config
./deploy/health-check.sh               # 7. confirm
```

Brief downtime (a few seconds during the node restart) is fine for ~10 users.
`DB_PATH` is outside the repo, so `git pull` never risks the database.

---

## 9. Backups

```bash
./deploy/backup.sh                     # -> ~/gym-tracker-backups/app-<timestamp>.db
./deploy/backup.sh /sdcard/Download    # -> somewhere you can copy off the phone
```

Uses SQLite's online `.backup` (safe while the server runs) and keeps the last 14.

**What to back up:**
- `~/gym-tracker-data/app.db` — the database (**critical**)
- `server/.env` — your `SESSION_SECRET` and paths (keep private, never commit)
- `$PREFIX/etc/nginx/nginx.conf` — only if you customised it beyond the repo copy

The **source code needs no backup** — it lives on GitHub and the frontend is
rebuilt from it.

Automate it with Termux:Tasks / cron if you like, e.g. daily:
`0 3 * * * ~/gym-tracker/deploy/backup.sh`

---

## 10. Troubleshooting

**`node:sqlite` unavailable / "Cannot find module 'node:sqlite'"**
Node is too old. `pkg upgrade nodejs`, confirm `node -v` ≥ 22.5, retry. Do not
install `better-sqlite3` / `sqlite3` — they need a native build the project
deliberately avoids.

**`npm start` → `Error: listen EADDRINUSE :::3000` / `127.0.0.1:3000`**
Another node is already running. `pkill -f 'node .*src/index.js'`, wait a second,
start again. Check with `pgrep -af node`.

**nginx `502 Bad Gateway` on `/api/...`**
The backend isn't running (or crashed). `pgrep -af 'src/index.js'`; read
`~/gym-tracker.log`; run `./deploy/start.sh` in the foreground to see the error.

**Deep link (`/history/5`) returns nginx 404**
The SPA fallback isn't active. `nginx -t` for config errors; confirm the `root`
line points at the real `client/dist` (must contain `index.html`); confirm the
`location /` block has `try_files $uri $uri/ /index.html;`. `nginx -s reload`.

**`/api/...` returns the HTML page instead of JSON**
The `location /api/` block is missing or ordered after `location /`. It must be
present and is matched by prefix regardless of order, but keep it above `location /`
for clarity. `nginx -t && nginx -s reload`.

**Frontend loads but every API call is 401 right after logging in**
Cookie isn't sticking. Check you're browsing nginx (`:8080`), not Express
(`:3000`) directly. Check the login response has
`Set-Cookie: connect.sid=...; HttpOnly; SameSite=Lax` (curl `-i`). Don't set the
cookie `secure` flag — there's no HTTPS here.

**"I was logged out" after a restart**
Expected — MemoryStore sessions don't survive a node restart. Log in again; your
data is intact. (See §7.)

**`SQLITE_CANTOPEN` / database permission error on startup**
`DB_PATH`'s directory doesn't exist or isn't writable. `mkdir -p` the directory,
check `ls -ld` on it, ensure the path in `server/.env` is absolute.

**nginx won't start: "bind() to 0.0.0.0:8080 failed (Permission denied)"**
Something else holds 8080, or you tried a port < 1024 (not allowed without root).
`pgrep -x nginx` (already running?), or pick another port ≥ 1024 in the config
and in your URLs.

**App shows an old version after updating**
`npm run build` didn't run, or the browser cached `index.html`. Rebuild;
hard-refresh the browser. The config sends `index.html` as `no-store` so this
should be rare.

---

## 11. Failure-mode expectations (tested behaviour)

| Situation | What happens |
|---|---|
| node stopped | nginx serves the frontend fine; `/api/*` → `502`. Restart node → recovers, no data lost. |
| nginx stopped | Whole app unreachable. `nginx` → recovers. |
| DB path unwritable at startup | node **exits with a clear `SQLITE_CANTOPEN` error** — it does not start in a broken state. Fix the path, restart. |
| Backend restart | All users logged out (MemoryStore); every routine/workout/set persists. |

---

## 12. Known V1 limitations (not deployment bugs)

1. **Sessions reset on backend restart** — `express-session` in-memory store.
   Users log in again; no data is lost.
2. **No HTTPS** in this LAN deployment. `secure=false` cookies are correct here.
   Add TLS (and flip the cookie to `secure=true`) only if you expose this beyond
   the LAN.
3. **No "resume last workout"** — an active workout is recovered by its URL
   (`/workout/:id`); a fresh `/workout` shows the start screen.
4. **No explicit workout completion** — a workout is just a row; "Finish" leaves
   the screen; any workout reopens at `/workout/:id`.
5. **Weight is kilograms**, no unit setting. `0` displays as "bodyweight".
6. **Dates** are stored UTC and shown in the viewer's local timezone; no per-user
   timezone.
7. **No history pagination** — fine at this scale.
8. **No automated browser E2E** — `E2E-CHECKLIST.md` is the manual pass;
   `server/test/smoke.sh` (65 checks) locks the API contract.

---

## 13. Final acceptance test (run this on the phone)

From the phone browser at `http://localhost:8080`:

1. Sign up user **A** → dashboard
2. Exercises load (21); search works
3. Create a routine; open it; add exercises
4. Start a routine workout; log several sets; check the set list
5. Hard-refresh `/workout/<id>` → workout + sets reconstructed
6. History → open the workout → sets grouped by exercise
7. Start a **freestyle** workout; log a set; check it in history
8. Log out → log back in → old data still there
9. `pkill` node, `./deploy/start.sh`, log in again → routines/workouts/sets intact
10. Sign up user **B** → B sees none of A's routines/workouts;
    `/routines/<A's id>`, `/history/<A's id>` → "not found"

Then `./deploy/health-check.sh` → `HEALTHY`. Deployment is done.
