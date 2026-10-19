// Who is an admin, and what the admin page shows about the server's setup.
// No database access here, so it can be unit tested on its own; the routes
// live in routes/admin.js.
//
// An admin is an account whose email is in ADMIN_EMAILS (comma-separated)
// AND has been verified. The verified part matters: anyone can type any
// address into Settings, so without it, whoever saved "sumit@gmail.com"
// first would get the admin page and see every user's email.

const DEFAULT_ADMIN_EMAILS = 'sumit@gmail.com';

/**
 * The admin addresses, lowercased.
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
function adminEmails(env = process.env) {
  return (env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when this users row belongs to an admin.
 * @param {{ email?: string | null, email_verified_at?: string | null }} user
 * @param {Record<string, string | undefined>} [env]
 */
function isAdmin(user, env = process.env) {
  return Boolean(
    user &&
    user.email &&
    user.email_verified_at &&
    adminEmails(env).includes(String(user.email).toLowerCase()),
  );
}

/**
 * What the server is set up with, for the admin page. Only on/off flags and
 * public values: API keys, tokens and the session secret are never included.
 * @param {Record<string, string | undefined>} env
 * @param {{ ai: { isConfigured: () => boolean, model: () => string },
 *           mailer: { describe: () => { provider: string | null, from: string | null | undefined } },
 *           appUrl: string | null, startedAt: Date }} parts
 */
function configSnapshot(env, { ai, mailer, appUrl, startedAt }) {
  const mail = mailer.describe();
  return {
    environment: env.NODE_ENV || 'development',
    timezone: env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    node_version: process.version,
    started_at: startedAt.toISOString(),
    database: env.TURSO_DATABASE_URL ? 'Turso (hosted)' : 'Local file',
    app_url: appUrl,
    ai_recap: {
      enabled: ai.isConfigured(),
      model: ai.isConfigured() ? ai.model() : null,
    },
    email: {
      enabled: mail.provider !== null,
      provider: mail.provider,
      from: mail.from || null,
    },
    admin_emails: adminEmails(env),
    session_days: 7,
  };
}

module.exports = {
  DEFAULT_ADMIN_EMAILS,
  adminEmails,
  isAdmin,
  configSnapshot,
};
