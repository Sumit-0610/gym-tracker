// Auth routes: signup, login, logout, and "who am I". Forgot password lives in
// password-reset.js.

const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const requireAuth = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rate-limit');
const { oneOf } = require('../validation');
const {
  BCRYPT_ROUNDS,
  MIN_PASSWORD,
  readEmail,
  isEmailTaken,
  loadMe,
} = require('../account');

const router = express.Router();

const WEIGHT_UNITS = ['kg', 'lb'];

router.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'username and password are required' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `password must be at least ${MIN_PASSWORD} characters`,
      });
    }
    // Optional: without one the account just can't use forgot password.
    const email = readEmail((req.body || {}).email);
    if (email && typeof email === 'object') {
      return res.status(400).json({ error: email.error });
    }

    // Never store the raw password. bcrypt.hash produces a one-way hash with a
    // random salt baked in, so identical passwords still get different hashes.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await run(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      username,
      passwordHash,
      email ?? null,
    );

    const id = Number(result.lastInsertRowid);
    req.session.userId = id; // log them in immediately
    // Same shape as GET /api/me, so the client has the preferences at once.
    res.status(201).json(await loadMe(id));
  } catch (err) {
    if (isEmailTaken(err)) {
      return res
        .status(409)
        .json({ error: 'That email is already used by another account.' });
    }
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'username already taken' });
    }
    next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'username and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', username);

    // One generic message whether the username is unknown or the password is
    // wrong — don't leak which usernames exist.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: 'invalid username or password' });
    }

    // Only the session id travels to the browser (in a signed cookie). The
    // userId stays server-side in the session store; the client never sees it.
    req.session.userId = user.id;
    // Same shape as GET /api/me: without the preferences the client would
    // show defaults (kg, no AI recap) until the next page refresh.
    res.json(await loadMe(user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

const REST_MIN = 15;
const REST_MAX = 600;

// Protected: used by the frontend on load to check for an existing session.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(await loadMe(req.userId));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/me
//   Update the caller's preferences. Any of:
//     { weight_unit: 'kg' | 'lb', rest_seconds: 15..600, ai_enabled: boolean,
//       email: string ('' or null removes it) }
//   Returns: 200 { id, username, email, created_at, weight_unit, rest_seconds,
//                  ai_enabled, ai_available, email_available }
//            409 another account already has that email
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = [];
    const args = [];

    if (body.weight_unit !== undefined) {
      const err = oneOf(body.weight_unit, 'weight_unit', WEIGHT_UNITS);
      if (err) return res.status(400).json({ error: err });
      updates.push('weight_unit = ?');
      args.push(body.weight_unit);
    }
    if (body.rest_seconds !== undefined) {
      const n = body.rest_seconds;
      if (!Number.isInteger(n) || n < REST_MIN || n > REST_MAX) {
        return res.status(400).json({
          error: `rest_seconds must be an integer ${REST_MIN}-${REST_MAX}`,
        });
      }
      updates.push('rest_seconds = ?');
      args.push(n);
    }
    if (body.ai_enabled !== undefined) {
      if (typeof body.ai_enabled !== 'boolean') {
        return res.status(400).json({ error: 'ai_enabled must be a boolean' });
      }
      updates.push('ai_enabled = ?');
      args.push(body.ai_enabled ? 1 : 0);
    }
    const email = readEmail(body.email);
    if (email && typeof email === 'object') {
      return res.status(400).json({ error: email.error });
    }
    if (email !== undefined) {
      updates.push('email = ?');
      args.push(email);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'no preferences to update' });
    }

    args.push(req.userId);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...args);

    res.json(await loadMe(req.userId));
  } catch (err) {
    if (isEmailTaken(err)) {
      return res
        .status(409)
        .json({ error: 'That email is already used by another account.' });
    }
    next(err);
  }
});

module.exports = router;
