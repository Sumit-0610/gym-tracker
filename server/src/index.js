// App entry point: wires middleware and routes, then starts listening.

const express = require('express');
const session = require('express-session');
const { init } = require('./db');

// Create tables and seed the exercise library before serving any requests.
init();

const app = express();

// Parse JSON request bodies into req.body.
app.use(express.json());

// Session middleware. For ~10 users we use the default in-memory store:
// simple, but sessions are lost on restart (everyone re-logs-in). A SQLite-
// backed store can be swapped in later without touching the route code.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS in the browser cannot read the cookie (XSS defense)
      sameSite: 'lax', // don't send the cookie on cross-site requests (CSRF defense)
      secure: false, // set true once the app is served over HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.get('/', (req, res) => res.send('hello'));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/exercises'));
// Later phases:
// app.use('/api', require('./routes/routines'));
// app.use('/api', require('./routes/workouts'));

// Central error handler. Express 4 does not catch throws from async handlers,
// so route code passes errors here via next(err).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`gym-tracker API listening on http://localhost:${PORT}`);
});
