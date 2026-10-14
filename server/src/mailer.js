// The one place the server sends email. Used by the data export's "email it
// to me" option, so switching provider is a change to this file only.
//
// Provider: Resend over its REST API (no SDK — one fetch call).
//   RESEND_API_KEY  required; without it the email option is hidden
//   EMAIL_FROM      optional sender, defaults to Resend's shared test sender.
//                   That sender can only deliver to the address that owns the
//                   Resend account; verify a domain in Resend and set
//                   EMAIL_FROM (e.g. "Gym Tracker <export@yourdomain.com>")
//                   to email anyone.
//
// The key lives only on the server (env var); it never reaches the browser.

const DEFAULT_FROM = 'Gym Tracker <onboarding@resend.dev>';
const TIMEOUT_MS = 15_000;
const API_URL = 'https://api.resend.com/emails';

/** True when an API key is configured, i.e. email can be sent at all. */
const isConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Send one plain-text email with one attachment. Throws on a missing key, a
 * timeout or an HTTP error, so callers have one failure path.
 * @param {{ to: string, subject: string, text: string,
 *           attachment: { filename: string, content: string } }} message
 */
async function sendMail({ to, subject, text, attachment }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject,
      text,
      attachments: [
        {
          filename: attachment.filename,
          content: Buffer.from(attachment.content, 'utf8').toString('base64'),
        },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Resend's error body names the problem (e.g. an unverified sender) but
    // can echo the request; log only the status and its short message.
    const data = /** @type {any} */ (await res.json().catch(() => null));
    throw new Error(
      `email provider returned HTTP ${res.status}${data?.message ? `: ${data.message}` : ''}`,
    );
  }
}

module.exports = { isConfigured, sendMail };
