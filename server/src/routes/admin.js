// Admin page data: every user, and how the server is set up. Only for admins
// (see ../admin.js for who counts as one).

const express = require('express');
const { all } = require('../db');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { isAdmin, configSnapshot } = require('../admin');
const { appBaseUrl } = require('../password-reset');
const ai = require('../ai');
const mailer = require('../mailer');

const router = express.Router();
router.use('/admin', requireAuth, requireAdmin);

const startedAt = new Date();

// GET /api/admin/users
//   Returns: 200 { count, users: [{ id, username, email, email_verified,
//                  is_admin, created_at, workout_count, last_workout_at }] }
//   Newest accounts first. Password hashes are never selected.
router.get('/admin/users', async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT u.id, u.username, u.email, u.email_verified_at, u.created_at,
              COUNT(w.id) AS workout_count, MAX(w.date) AS last_workout_at
         FROM users u
         LEFT JOIN workouts w ON w.user_id = u.id
        GROUP BY u.id
        ORDER BY u.id DESC`,
    );
    const users = rows.map((u) => ({
      id: Number(u.id),
      username: u.username,
      email: u.email,
      email_verified: Boolean(u.email_verified_at),
      is_admin: isAdmin(u),
      created_at: u.created_at,
      workout_count: Number(u.workout_count),
      last_workout_at: u.last_workout_at,
    }));
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/config
//   Returns: 200 what the server is set up with (no secrets; see configSnapshot)
router.get('/admin/config', (req, res) => {
  res.json(
    configSnapshot(process.env, {
      ai,
      mailer,
      appUrl: appBaseUrl(process.env, req),
      startedAt,
    }),
  );
});

module.exports = router;
