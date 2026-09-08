# Historical artifacts

Superseded material, kept for reference. Nothing here is part of the running
app.

- **`DEPLOYMENT-termux-v1.md`** + **`deploy-termux-v1/`** — the V1 deployment:
  the app on an Android phone via Termux + nginx, with `node:sqlite`. V2 moved
  to Render + Turso (`../../DEPLOYMENT-CLOUD.md`) and the V2 code can't build on
  Termux. The `deploy-termux-v1/` scripts (`start.sh`, `backup.sh`,
  `health-check.sh`) and nginx configs are for that setup only.
- **`requests-v1.http`** — an old REST Client scratch file for the V1 API.

The full V1 technical walkthrough is `../../GYM_TRACKER_V1_TECHNICAL_GUIDE.pdf`.
