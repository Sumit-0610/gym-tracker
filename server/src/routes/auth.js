// Auth routes: signup, login, logout, and "who am I".

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// bcrypt "cost factor": the hash runs 2^rounds internal iterations. Each +1
// doubles the time. 12 is a common default — a few hundred ms per hash, which
// is trivial for one login but makes brute-forcing a stolen table of hashes
// enormously expensive.
const BCRYPT_ROUNDS = 12;

router.post('/signup', async (req, res, next) => {
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

    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, passwordHash);

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

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username);

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

// Protected: used by the frontend on load to check for an existing session.
router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
    .get(req.userId);
  res.json(user);
});

module.exports = router;
