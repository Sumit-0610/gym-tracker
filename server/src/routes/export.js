// Data export: download, or email, everything the caller logged in a date
// range. See export.js for the data and file formats, mailer.js for sending.

const express = require('express');
const requireAuth = require('../middleware/auth');
const { exportEmailLimiter } = require('../middleware/rate-limit');
const {
  parseRange,
  loadExport,
  toCsv,
  toJson,
  exportFilename,
} = require('../export');
const mailer = require('../mailer');

const router = express.Router();
router.use(requireAuth);

// Loose on purpose: something@something.tld, no spaces. The provider does the
// real check; this catches typos before a round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

const CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

/** Build the file for a validated range. */
async function buildFile(userId, { from, to, format }) {
  const data = await loadExport(userId, from, to);
  return {
    data,
    filename: exportFilename(from, to, format),
    content: format === 'csv' ? toCsv(data) : toJson(data),
  };
}

// GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|json
//   Downloads the caller's data for the range (inclusive). format defaults to
//   csv: one row per set. json: workouts with nested sets, plus bodyweight.
//   Returns: 200 the file, as an attachment
//            400 bad range / format
router.get('/export', async (req, res, next) => {
  try {
    const range = parseRange(req.query);
    if ('error' in range) return res.status(400).json({ error: range.error });

    const { filename, content } = await buildFile(req.userId, range);
    res.set({
      'Content-Type': CONTENT_TYPES[range.format],
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(content);
  } catch (err) {
    next(err);
  }
});

// POST /api/export/email
//   Body:    { from, to, format?, email }
//   Emails the same file as GET /api/export to `email` as an attachment.
//   Returns: 200 { ok: true, workouts, sets }
//            400 bad range / format / email
//            429 too many export emails (exportEmailLimiter)
//            502 the email provider failed
//            503 no email provider configured on this server
router.post('/export/email', exportEmailLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const range = parseRange(body);
    if ('error' in range) return res.status(400).json({ error: range.error });

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!mailer.isConfigured()) {
      return res
        .status(503)
        .json({ error: 'Email is not set up on this server.' });
    }

    const { data, filename, content } = await buildFile(req.userId, range);
    const sets = data.workouts.reduce((n, w) => n + w.sets.length, 0);

    try {
      await mailer.sendMail({
        to: email,
        subject: `Your Gym Tracker export (${range.from} to ${range.to})`,
        text:
          `Attached is your workout data from ${range.from} to ${range.to}: ` +
          `${data.workouts.length} workouts, ${sets} sets and ` +
          `${data.measurements.length} bodyweight entries.\n\n` +
          `Weights are in ${data.unit}.\n`,
        attachment: { filename, content },
      });
    } catch (err) {
      console.error(
        `[email] export for user ${req.userId} failed: ${err.message}`,
      );
      return res.status(502).json({
        error: 'Could not send the email right now. Try downloading instead.',
      });
    }

    res.json({ ok: true, workouts: data.workouts.length, sets });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
