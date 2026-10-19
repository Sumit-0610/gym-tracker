// "Verify your email" helpers. Same token scheme as password-reset.js (a
// random token in the link, only its hash in the database); this file just
// adds the link and the email text. Routes: routes/email-verify.js.

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** @param {string} baseUrl @param {string} token */
const verifyLink = (baseUrl, token) => `${baseUrl}/verify-email?token=${token}`;

/**
 * @param {string} username
 * @param {string} link
 */
function verifyEmailText(username, link) {
  return [
    `Hi ${username},`,
    '',
    'Open this link within 24 hours to confirm this is your email address',
    'for your Gym Tracker account:',
    '',
    link,
    '',
    "If you didn't ask for this, ignore this email.",
  ].join('\n');
}

module.exports = { VERIFY_TTL_MS, verifyLink, verifyEmailText };
