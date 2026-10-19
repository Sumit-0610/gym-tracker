// Forgot-password helpers: the token, its hash, and the link that gets emailed.
// The routes live in routes/password-reset.js; this file has no database or
// network access so it can be unit tested on its own.
//
// How a reset works, end to end:
//   1. POST /api/password/forgot { email } makes a random token, stores only
//      its SHA-256 hash with a 30-minute expiry, and emails a link that holds
//      the raw token: <app>/reset-password?token=<token>
//   2. POST /api/password/reset { token, password } hashes the token it was
//      given, looks the hash up, and if it is unused and unexpired, saves the
//      new password and marks the link used.
// Other signed-in devices stay signed in: a reset changes the password, it
// does not log anyone out.

const crypto = require('node:crypto');

const TOKEN_TTL_MS = 30 * 60 * 1000;

/** 32 random bytes as 64 hex characters: impossible to guess. */
const newToken = () => crypto.randomBytes(32).toString('hex');

/**
 * What the database stores instead of the token. A plain SHA-256 (not bcrypt)
 * is enough: the token is already 256 random bits, so there is nothing to
 * brute-force, and a fast hash lets us look it up by value.
 * @param {string} token
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** True for a string shaped like a token from newToken(). */
const isTokenShaped = (value) =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/**
 * The public address of the app, with no trailing slash, or null when it is
 * unknown. APP_URL wins; Render sets RENDER_EXTERNAL_URL on its own. Outside
 * production the request's own host is used, so local dev needs no setup.
 *
 * Production never trusts the request's Host header: anyone can send a forgot
 * request with a fake Host, and the victim's email would then link to the
 * attacker's site, handing it the token.
 * @param {Record<string, string | undefined>} env
 * @param {{ protocol: string, get: (name: string) => string | undefined }} req
 * @returns {string | null}
 */
function appBaseUrl(env, req) {
  const configured = env.APP_URL || env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (env.NODE_ENV === 'production') return null;
  const host = req.get('host');
  return host ? `${req.protocol}://${host}` : null;
}

/** @param {string} baseUrl @param {string} token */
const resetLink = (baseUrl, token) =>
  `${baseUrl}/reset-password?token=${token}`;

/**
 * The email body. Plain text, like the export email.
 * @param {string} username
 * @param {string} link
 */
function resetEmailText(username, link) {
  return [
    `Hi ${username},`,
    '',
    'Someone asked to reset the password for your Gym Tracker account.',
    'To choose a new password, open this link within 30 minutes:',
    '',
    link,
    '',
    "If you didn't ask for this, ignore this email. Your password stays the same.",
  ].join('\n');
}

module.exports = {
  TOKEN_TTL_MS,
  newToken,
  hashToken,
  isTokenShaped,
  appBaseUrl,
  resetLink,
  resetEmailText,
};
