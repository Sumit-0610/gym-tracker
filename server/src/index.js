// App entry point: wires middleware and routes, then starts listening.

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
/** helmet's CJS entry is the middleware factory; its ESM-shaped types confuse checkJs. */
const helmet = /** @type {any} */ (require('helmet'));
const { init } = require('./db');
const LibsqlStore = require('./session-store');

const PRODUCTION = process.env.NODE_ENV === 'production';

// The session secret signs the session-id cookie so it cannot be forged. In
// production it MUST be provided — refuse to boot with the throwaway dev value.
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-only-secret-change-me';
if (PRODUCTION && SESSION_SECRET === 'dev-only-secret-change-me') {
  console.error('SESSION_SECRET must be set in production.');
  process.exit(1);
}

const app = express();

// The host (Render) terminates HTTPS and forwards to this process over plain
// HTTP, setting X-Forwarded-* headers. `trust proxy` tells Express to believe
// them, so req.secure is true and the Secure cookie is actually sent.
if (PRODUCTION) app.set('trust proxy', 1);

// Baseline security headers: HSTS, nosniff, frame-deny, referrer policy,
// no X-Powered-By, etc. CSP is disabled: this is a single-origin SPA with no
// user-authored HTML and React escapes all output, and a strict CSP for a
// bundled SPA is fiddly enough to be its own task.
app.use(helmet({ contentSecurityPolicy: false }));

// Parse JSON request bodies into req.body. 32 KB is far more than any request
// this API makes (the largest is a routine name or a set); reject the rest.
app.use(express.json({ limit: '32kb' }));

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
  }),
);

// Liveness probe — Render's health check and the keep-alive ping hit this.
// A dedicated path (not `/`) so the app itself is served at the root.
// Deliberately does not touch the database.
app.get('/healthz', (req, res) => res.send('ok'));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/exercises'));
app.use('/api', require('./routes/routines'));
app.use('/api', require('./routes/workouts'));
app.use('/api', require('./routes/stats'));
app.use('/api', require('./routes/measurements'));

// Any /api path that matched no route above is a 404 — answer in JSON, not the
// SPA fallback's index.html (and not Express's default HTML error page).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not found' });
});

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
// so route code passes errors here via next(err). The 4-arg signature is what
// marks this as an error handler; `next` is unused but required.
app.use((err, req, res, next) => {
  // express.json() rejects malformed / oversized bodies before any route runs.
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request body too large' });
  }
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ error: 'invalid request body' });
  }
  console.error(
    `[error] ${req.method} ${req.originalUrl} — ${err && err.message}`,
    err && err.stack ? `\n${err.stack}` : '',
  );
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
