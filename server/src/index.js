// App entry point: wires middleware and routes, then starts listening.

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const { init } = require('./db');
const LibsqlStore = require('./session-store');

const PRODUCTION = process.env.NODE_ENV === 'production';

// The session secret signs the session-id cookie so it cannot be forged. In
// production it MUST be provided — refuse to boot with the throwaway dev value.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
if (PRODUCTION && SESSION_SECRET === 'dev-only-secret-change-me') {
  console.error('SESSION_SECRET must be set in production.');
  process.exit(1);
}

const app = express();

// The host (Render) terminates HTTPS and forwards to this process over plain
// HTTP, setting X-Forwarded-* headers. `trust proxy` tells Express to believe
// them, so req.secure is true and the Secure cookie is actually sent.
if (PRODUCTION) app.set('trust proxy', 1);

// Parse JSON request bodies into req.body.
app.use(express.json());

// Session middleware, backed by the libSQL store so logins survive a restart.
app.use(
  session({
    secret: SESSION_SECRET,
    store: new LibsqlStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS in the browser cannot read the cookie (XSS defense)
      sameSite: 'lax', // not sent on cross-site requests (CSRF defense); frontend + API are same-origin
      secure: PRODUCTION, // HTTPS-only in production; false for local http dev
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Liveness probe — also what the keep-alive ping hits. Deliberately does not
// touch the database.
app.get('/', (req, res) => res.send('hello'));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/exercises'));
app.use('/api', require('./routes/routines'));
app.use('/api', require('./routes/workouts'));

// Serve the built frontend and provide the SPA fallback — the job nginx did in
// the V1 phone deployment. In local API-only dev `client/dist` may not exist,
// so this is skipped and Vite serves the frontend instead.
const clientDist =
  process.env.CLIENT_DIST || path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Any non-/api path that didn't match a file returns index.html so the
  // client-side router can handle it (e.g. a hard refresh of /history/5).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Central error handler. Express 4 does not catch throws from async handlers,
// so route code passes errors here via next(err).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
// Bind loopback by default so a local `npm start` is not exposed on the LAN.
// The cloud host sets HOST=0.0.0.0 (its router must reach the process) and
// injects PORT.
const HOST = process.env.HOST || '127.0.0.1';

// The database client is async, so schema creation + seeding must finish before
// the first request is served. Start listening only after init() resolves; if
// it rejects (database unreachable / misconfigured) fail loudly instead of
// serving a broken app.
init()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`gym-tracker API listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise the database:', err);
    process.exit(1);
  });
