// Account helpers shared by the auth routes (auth.js) and forgot password
// (password-reset.js).

const { get } = require('./db');
const { isEmail, normalizeEmail } = require('./validation');
const ai = require('./ai');
const mailer = require('./mailer');
const { isAdmin } = require('./admin');

// bcrypt "cost factor": the hash runs 2^rounds internal iterations. Each +1
// doubles the time. 12 is a common default — a few hundred ms per hash, which
// is trivial for one login but makes brute-forcing a stolen table of hashes
// enormously expensive.
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 6;

/**
 * Read an optional email from a request body: undefined when not sent, null
 * when sent empty (no email), the normalized address, or { error }.
 * @param {unknown} value
 * @returns {undefined | null | string | { error: string }}
 */
function readEmail(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return { error: 'email must be a string' };
  const email = normalizeEmail(value);
  if (email === '') return null;
  return isEmail(email) ? email : { error: 'Enter a valid email address.' };
}

/** True when a write failed because another account already has the email. */
const isEmailTaken = (err) =>
  String(err && err.message).includes('UNIQUE') &&
  String(err.message).includes('email');

const ME_COLUMNS =
  'id, username, email, email_verified_at, created_at, weight_unit, rest_seconds, ai_enabled';

/**
 * The caller's profile + preferences, as GET/PATCH /api/me return it.
 * ai_enabled comes back as a boolean; ai_available says whether this server
 * has an AI provider configured at all (the client hides the toggle if not);
 * email_available likewise for emailing a data export (and the email links).
 * is_admin says whether to show the Admin page link.
 * @param {number} userId
 */
async function loadMe(userId) {
  const user = await get(
    `SELECT ${ME_COLUMNS} FROM users WHERE id = ?`,
    userId,
  );
  if (!user) return user;
  const { email_verified_at: verifiedAt, ...rest } = user;
  return {
    ...rest,
    email_verified: Boolean(verifiedAt),
    is_admin: isAdmin(user),
    ai_enabled: Boolean(user.ai_enabled),
    ai_available: ai.isConfigured(),
    email_available: mailer.isConfigured(),
  };
}

module.exports = {
  BCRYPT_ROUNDS,
  MIN_PASSWORD,
  readEmail,
  isEmailTaken,
  loadMe,
};
