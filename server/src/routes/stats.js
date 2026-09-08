// Training-volume stats.
//
// "Volume" here = total weight moved = SUM(reps * weight) over sets, in
// kilograms (the client converts for lb users). Bodyweight sets (weight 0)
// contribute 0, which is the sensible reading of "weight lifted".

const express = require('express');
const { get } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/stats
//   Returns: 200 {
//     volume: { last_7_days, last_30_days, last_365_days, all_time },   // kg
//     workouts: { last_7_days, last_30_days, last_365_days, all_time }, // counts
//     total_sets: <int>
//   }
//
// One query. `w.date` is a UTC 'YYYY-MM-DD HH:MM:SS' string and SQLite's
// date('now', '-N days') is UTC too, so the string comparison is a correct
// date comparison (ISO order == lexical order).
router.get('/stats', async (req, res, next) => {
  try {
    const row = await get(
      `SELECT
         COALESCE(SUM(CASE WHEN w.date >= date('now','-7 days')   THEN ws.reps * ws.weight END), 0) AS vol_7,
         COALESCE(SUM(CASE WHEN w.date >= date('now','-30 days')  THEN ws.reps * ws.weight END), 0) AS vol_30,
         COALESCE(SUM(CASE WHEN w.date >= date('now','-365 days') THEN ws.reps * ws.weight END), 0) AS vol_365,
         COALESCE(SUM(ws.reps * ws.weight), 0) AS vol_all,
         COUNT(DISTINCT CASE WHEN w.date >= date('now','-7 days')   THEN w.id END) AS wk_7,
         COUNT(DISTINCT CASE WHEN w.date >= date('now','-30 days')  THEN w.id END) AS wk_30,
         COUNT(DISTINCT CASE WHEN w.date >= date('now','-365 days') THEN w.id END) AS wk_365,
         COUNT(DISTINCT w.id) AS wk_all,
         COUNT(ws.id) AS total_sets
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id
       WHERE w.user_id = ?`,
      req.userId
    );

    res.json({
      volume: {
        last_7_days: row.vol_7,
        last_30_days: row.vol_30,
        last_365_days: row.vol_365,
        all_time: row.vol_all,
      },
      workouts: {
        last_7_days: row.wk_7,
        last_30_days: row.wk_30,
        last_365_days: row.wk_365,
        all_time: row.wk_all,
      },
      total_sets: row.total_sets,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
