// Auth routes: signup, login, logout, and "who am I".

const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const requireAuth = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rate-limit');
const { oneOf } = require('../validation');

const router = express.Router();

const WEIGHT_UNITS = ['kg', 'lb'];

// bcrypt "cost factor": the hash runs 2^rounds internal iterations. Each +1
// doubles the time. 12 is a common default — a few hundred ms per hash, which
// is trivial for one login but makes brute-forcing a stolen table of hashes
// enormously expensive.
const BCRYPT_ROUNDS = 12;

router.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    // Never store the raw password. bcrypt.hash produces a one-way hash with a
    // random salt baked in, so identical passwords still get different hashes.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      username,
      passwordHash
    );

    const id = Number(result.lastInsertRowid);
    req.session.userId = id; // log them in immediately
    res.status(201).json({ id, username });
  } catch (err) {
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
      return res.status(400).json({ error: 'username and password are required' });
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
    res.json({ id: user.id, username: user.username });
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

const ME_COLUMNS = 'id, username, created_at, weight_unit, rest_seconds';
const REST_MIN = 15;
const REST_MAX = 600;

// Protected: used by the frontend on load to check for an existing session.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT ${ME_COLUMNS} FROM users WHERE id = ?`,
      req.userId
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/me
//   Update the caller's preferences. Any of:
//     { weight_unit: 'kg' | 'lb', rest_seconds: 15..600 }
//   Returns: 200 { id, username, created_at, weight_unit, rest_seconds }
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
        return res
          .status(400)
          .json({ error: `rest_seconds must be an integer ${REST_MIN}-${REST_MAX}` });
      }
      updates.push('rest_seconds = ?');
      args.push(n);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'no preferences to update' });
    }

    args.push(req.userId);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...args);

    const user = await get(
      `SELECT ${ME_COLUMNS} FROM users WHERE id = ?`,
      req.userId
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
