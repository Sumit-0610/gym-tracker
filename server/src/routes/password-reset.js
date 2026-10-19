// Forgot password: email a one-time link, then set a new password with it.
// See ../password-reset.js for how the token and link work.

const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const { forgotLimiter, resetLimiter } = require('../middleware/rate-limit');
const { isEmail, normalizeEmail } = require('../validation');
const mailer = require('../mailer');
const {
  TOKEN_TTL_MS,
  newToken,
  hashToken,
  isTokenShaped,
  appBaseUrl,
  resetLink,
  resetEmailText,
} = require('../password-reset');
const { BCRYPT_ROUNDS, MIN_PASSWORD, loadMe } = require('../account');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/password/forgot
//   Body:    { email }
//   Returns: 200 { ok: true } whether or not an account has that email, so the
//            form cannot be used to find out who has an account here.
//            400 not an email address
//            429 too many requests (forgotLimiter)
//            503 email is not set up on this server
router.post('/password/forgot', forgotLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail((req.body || {}).email);
    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    const baseUrl = appBaseUrl(process.env, req);
    if (!mailer.isConfigured() || !baseUrl) {
      if (mailer.isConfigured()) {
        console.error('[password] APP_URL is not set; cannot build reset link');
      }
      return res.status(503).json({
        error: 'Password reset by email is not set up on this server.',
      });
    }

    const user = await get(
      'SELECT id, username FROM users WHERE email = ?',
      email,
    );
    if (user) {
      const token = newToken();
      const now = Date.now();
      // Only the newest link works: asking again replaces any earlier one.
      // Old used/expired rows are tidied up at the same time.
      await run(
        'DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?',
        user.id,
        now - DAY_MS,
      );
      await run(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        user.id,
        hashToken(token),
        now + TOKEN_TTL_MS,
      );
      // Not awaited: waiting for the email provider only when the account
      // exists would make those responses slower, and the timing alone would
      // tell an attacker which emails are registered.
      mailer
        .sendMail({
          to: email,
          subject: 'Reset your Gym Tracker password',
          text: resetEmailText(user.username, resetLink(baseUrl, token)),
        })
        .catch((err) =>
          console.error(
            `[email] reset for user ${user.id} failed: ${err.message}`,
          ),
        );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/password/reset
//   Body:    { token, password }
//   Sets the new password and signs this browser in. Sessions on other
//   devices are left alone: nobody is logged out until they log out.
//   Returns: 200 the same user object as GET /api/me
//            400 password too short, or the link is invalid, used or expired
//            429 too many attempts (resetLimiter)
router.post('/password/reset', resetLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `password must be at least ${MIN_PASSWORD} characters`,
      });
    }
    const invalid = () =>
      res.status(400).json({
        error: 'This reset link is invalid or has expired.',
      });
    if (!isTokenShaped(token)) return invalid();

    // Hash first (slow), then claim the link in one statement, so two tabs
    // racing with the same link cannot both use it.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = Date.now();
    const claimed = await get(
      `UPDATE password_resets SET used_at = ?
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
       RETURNING user_id`,
      now,
      hashToken(token),
      now,
    );
    if (!claimed) return invalid();

    const userId = Number(claimed.user_id);
    await run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      passwordHash,
      userId,
    );

    req.session.userId = userId;
    res.json(await loadMe(userId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
