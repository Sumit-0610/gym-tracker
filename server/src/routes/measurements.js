// Bodyweight log. One entry per calendar day per user; re-logging a day
// overwrites it. Weight is stored in kilograms; the client converts.

const express = require('express');
const { get, all, run } = require('../db');
const requireAuth = require('../middleware/auth');
const { parseId, nonNegativeNumber } = require('../validation');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/measurements
//   Returns: 200 [{ id, date, weight }]  newest first
router.get('/measurements', async (req, res, next) => {
  try {
    const rows = await all(
      'SELECT id, date, weight FROM measurements WHERE user_id = ? ORDER BY date DESC, id DESC',
      req.userId
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/measurements
//   Body:    { weight, date? }   — weight in kg; date defaults to today in the
//            server's timezone (the client normally sends its own local date).
//   Returns: 201 when a new day was logged, 200 when an existing day was
//            updated (this endpoint upserts by (user, date)).
router.post('/measurements', async (req, res, next) => {
  try {
    const { weight } = req.body || {};
    const date =
      (req.body && req.body.date) || new Date().toLocaleDateString('en-CA');

    const err = nonNegativeNumber(weight, 'weight');
    if (err) return res.status(400).json({ error: err });
    if (weight <= 0) return res.status(400).json({ error: 'weight must be greater than 0' });
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }

    const existing = await get(
      'SELECT id FROM measurements WHERE user_id = ? AND date = ?',
      req.userId,
      date
    );

    await run(
      `INSERT INTO measurements (user_id, date, weight) VALUES (?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET weight = excluded.weight`,
      req.userId,
      date,
      weight
    );

    const saved = await get(
      'SELECT id, date, weight FROM measurements WHERE user_id = ? AND date = ?',
      req.userId,
      date
    );
    res.status(existing ? 200 : 201).json(saved);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/measurements/:id
//   Returns: 200 { ok: true } | 404
router.delete('/measurements/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ error: 'measurement not found' });

    const row = await get(
      'SELECT id FROM measurements WHERE id = ? AND user_id = ?',
      id,
      req.userId
    );
    if (!row) return res.status(404).json({ error: 'measurement not found' });

    await run('DELETE FROM measurements WHERE id = ?', id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
