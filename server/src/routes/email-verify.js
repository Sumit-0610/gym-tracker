// Verify the account email: send a one-time link, then confirm it.
// A verified email is what lets an admin address open the admin page.

const express = require('express');
const { get, run } = require('../db');
const requireAuth = require('../middleware/auth');
const {
  verifyRequestLimiter,
  verifyLinkLimiter,
} = require('../middleware/rate-limit');
const mailer = require('../mailer');
const {
  newToken,
  hashToken,
  isTokenShaped,
  appBaseUrl,
} = require('../password-reset');
const {
  VERIFY_TTL_MS,
  verifyLink,
  verifyEmailText,
} = require('../email-verify');
const { loadMe } = require('../account');

const router = express.Router();

// POST /api/me/email/verify
//   Emails a verify link to the signed-in user's current email.
//   Returns: 200 { ok: true }
//            400 no email, or it is already verified
//            429 too many requests (verifyRequestLimiter)
//            502 the email provider failed
//            503 email is not set up on this server
router.post(
  '/me/email/verify',
  requireAuth,
  verifyRequestLimiter,
  async (req, res, next) => {
    try {
      const user = await get(
        'SELECT id, username, email, email_verified_at FROM users WHERE id = ?',
        req.userId,
      );
      if (!user || !user.email) {
        return res.status(400).json({ error: 'Add an email first.' });
      }
      if (user.email_verified_at) {
        return res
          .status(400)
          .json({ error: 'Your email is already verified.' });
      }
      const baseUrl = appBaseUrl(process.env, req);
      if (!mailer.isConfigured() || !baseUrl) {
        return res.status(503).json({
          error: 'Sending email is not set up on this server.',
        });
      }

      const token = newToken();
      const now = Date.now();
      // Only the newest link works; old rows are tidied up at the same time.
      await run(
        'DELETE FROM email_verifications WHERE user_id = ? OR expires_at < ?',
        user.id,
        now - VERIFY_TTL_MS,
      );
      await run(
        'INSERT INTO email_verifications (user_id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)',
        user.id,
        user.email,
        hashToken(token),
        now + VERIFY_TTL_MS,
      );
      try {
        await mailer.sendMail({
          to: user.email,
          subject: 'Verify your Gym Tracker email',
          text: verifyEmailText(user.username, verifyLink(baseUrl, token)),
        });
      } catch (err) {
        console.error(
          `[email] verify for user ${user.id} failed: ${err.message}`,
        );
        return res
          .status(502)
          .json({ error: 'Could not send the email. Try again later.' });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/email/verify
//   Body:    { token }
//   Works signed in or not (the link may be opened on another device).
//   Returns: 200 { ok: true, user } with user as GET /api/me returns it when
//              this browser is signed in to that account, else user: null
//            400 the link is invalid, used, expired, or for an old email
//            429 too many attempts (verifyLinkLimiter)
router.post('/email/verify', verifyLinkLimiter, async (req, res, next) => {
  try {
    const { token } = req.body || {};
    const invalid = (error = 'This verify link is invalid or has expired.') =>
      res.status(400).json({ error });
    if (!isTokenShaped(token)) return invalid();

    const now = Date.now();
    const claimed = await get(
      `UPDATE email_verifications SET used_at = ?
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
       RETURNING user_id, email`,
      now,
      hashToken(token),
      now,
    );
    if (!claimed) return invalid();

    const userId = Number(claimed.user_id);
    const result = await run(
      `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP
        WHERE id = ? AND email = ?`,
      userId,
      claimed.email,
    );
    if (result.rowsAffected === 0) {
      return invalid(
        'This link was for an email the account no longer uses. Send a new one from Settings.',
      );
    }

    const signedInHere = req.session && req.session.userId === userId;
    res.json({ ok: true, user: signedInHere ? await loadMe(userId) : null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
