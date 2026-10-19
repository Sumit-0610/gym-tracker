// The one place the server sends email. Used by the data export's "email it"
// option and by the forgot-password link, so switching provider is a change to this file only. Each provider
// is one fetch call to its REST API (no SDK). The first one configured wins:
//
// Brevo — sends to any address with no domain of your own: you verify a single
//   sender address (e.g. your Gmail) in Brevo by clicking a link it emails you.
//   BREVO_API_KEY  the API key (Brevo → SMTP & API → API keys)
//   EMAIL_FROM     required; the verified sender, "Name <you@gmail.com>" or
//                  just "you@gmail.com"
//
// Resend — needs a domain you own to send to anyone; without one its test
//   sender only delivers to the Resend account's own address.
//   RESEND_API_KEY  the API key
//   EMAIL_FROM      optional, defaults to Resend's test sender
//
// Keys live only on the server (env vars); they never reach the browser.

const TIMEOUT_MS = 15_000;
const RESEND_DEFAULT_FROM = 'Gym Tracker <onboarding@resend.dev>';

/**
 * Split "Name <a@b.c>" (or a bare "a@b.c") into its parts.
 * @param {string} from
 * @returns {{ name: string | undefined, email: string }}
 */
function parseFrom(from) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return m
    ? { name: m[1] || undefined, email: m[2].trim() }
    : { name: undefined, email: from.trim() };
}

/** Which provider is configured, or null when email is off. */
function provider() {
  if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

/** True when email can be sent at all. */
const isConfigured = () => provider() !== null;

/**
 * An Error with the status and the provider's short message, never the body.
 * `reason` is that message alone (e.g. "unrecognised IP address"), safe to
 * show the signed-in user so a setup problem can be fixed without the logs.
 */
async function failure(res, name) {
  const data = /** @type {any} */ (await res.json().catch(() => null));
  const message = typeof data?.message === 'string' ? data.message : '';
  const err = /** @type {Error & { reason?: string }} */ (
    new Error(
      `${name} returned HTTP ${res.status}${message ? `: ${message}` : ''}`,
    )
  );
  err.reason = `${name}: ${message || `HTTP ${res.status}`}`;
  return err;
}

/** fetch(), but a network error or timeout also carries a user-facing reason. */
async function post(name, url, init) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    const err = /** @type {Error & { reason?: string }} */ (
      new Error(`${name} request failed: ${cause.message}`)
    );
    err.reason = `${name}: could not connect (${cause.message})`;
    throw err;
  }
}

/**
 * Send one plain-text email, optionally with one attachment. Throws when no
 * provider is configured, on a timeout or on an HTTP error, so callers have
 * one failure path.
 * @param {{ to: string, subject: string, text: string,
 *           attachment?: { filename: string, content: string } }} message
 */
async function sendMail({ to, subject, text, attachment }) {
  const file = attachment && {
    filename: attachment.filename,
    content: Buffer.from(attachment.content, 'utf8').toString('base64'),
  };
  const which = provider();

  if (which === 'brevo') {
    const sender = parseFrom(process.env.EMAIL_FROM || '');
    const res = await post('Brevo', 'https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: sender.name ? sender : { email: sender.email },
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(file && {
          attachment: [{ name: file.filename, content: file.content }],
        }),
      }),
    });
    if (!res.ok) throw await failure(res, 'Brevo');
    return;
  }

  if (which === 'resend') {
    const res = await post('Resend', 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || RESEND_DEFAULT_FROM,
        to: [to],
        subject,
        text,
        ...(file && { attachments: [file] }),
      }),
    });
    if (!res.ok) throw await failure(res, 'Resend');
    return;
  }

  throw new Error('no email provider is configured');
}

module.exports = { isConfigured, sendMail, parseFrom };
