// Auth routes: signup, login, logout, and "who am I".

const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const requireAuth = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rate-limit');
const { oneOf } = require('../validation');
const ai = require('../ai');

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
      return res
        .status(400)
        .json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'password must be at least 6 characters' });
    }

    // Never store the raw password. bcrypt.hash produces a one-way hash with a
    // random salt baked in, so identical passwords still get different hashes.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      username,
      passwordHash,
    );

    const id = Number(result.lastInsertRowid);
    req.session.userId = id; // log them in immediately
    // Same shape as GET /api/me, so the client has the preferences at once.
    res.status(201).json(await loadMe(id));
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

const ME_COLUMNS =
  'id, username, created_at, weight_unit, rest_seconds, ai_enabled';

/**
 * The caller's profile + preferences, as GET/PATCH /api/me return it.
 * ai_enabled comes back as a boolean; ai_available says whether this server
 * has an AI provider configured at all (the client hides the toggle if not).
 * @param {number} userId
 */
async function loadMe(userId) {
  const user = await get(
    `SELECT ${ME_COLUMNS} FROM users WHERE id = ?`,
    userId,
  );
  if (!user) return user;
  return {
    ...user,
    ai_enabled: Boolean(user.ai_enabled),
    ai_available: ai.isConfigured(),
  };
}
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
//     { weight_unit: 'kg' | 'lb', rest_seconds: 15..600, ai_enabled: boolean }
//   Returns: 200 { id, username, created_at, weight_unit, rest_seconds,
//                  ai_enabled, ai_available }
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
    if (updates.length === 0) {
      return res.status(400).json({ error: 'no preferences to update' });
    }

    args.push(req.userId);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...args);

    res.json(await loadMe(req.userId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
