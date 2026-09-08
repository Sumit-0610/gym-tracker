// Training-volume and activity stats.
//
// "Volume" = total weight moved = SUM(reps * weight) over sets, in kilograms
// (the client converts for lb users). Bodyweight sets (weight 0) contribute 0.

const express = require('express');
const { get, all } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Monday of the week containing `d` (a Date), at 00:00 UTC.
function weekStart(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}
const ymd = (d) => d.toISOString().slice(0, 10);

// GET /api/stats
//   Volume + workout counts over the last 7 / 30 / 365 days and all time,
//   plus the all-time workout count and the current week streak (consecutive
//   weeks up to this one that contain at least one workout).
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

    // Total workouts (including ones with no sets) and the set of weeks that
    // have a workout, for the streak.
    const days = await all(
      `SELECT date(w.date) AS day, COUNT(*) AS n
         FROM workouts w
        WHERE w.user_id = ?
        GROUP BY day`,
      req.userId
    );
    const workoutCount = days.reduce((t, d) => t + d.n, 0);

    const weeksWithWorkout = new Set(days.map((d) => ymd(weekStart(new Date(d.day + 'T00:00:00Z')))));
    let streak = 0;
    let cursor = weekStart(new Date());
    while (weeksWithWorkout.has(ymd(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 7);
    }

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
      workout_count: workoutCount,
      week_streak: streak,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/weekly?weeks=12
//   Per-week totals for the last N weeks (Monday-based, oldest first):
//   [{ week_start: 'YYYY-MM-DD', volume, reps, sets, workouts }]
router.get('/stats/weekly', async (req, res, next) => {
  try {
    const weeks = Math.min(52, Math.max(4, Math.trunc(Number(req.query.weeks)) || 12));
    const firstMonday = weekStart(new Date());
    firstMonday.setUTCDate(firstMonday.getUTCDate() - 7 * (weeks - 1));

    // Empty buckets first, keyed by Monday date.
    const buckets = new Map();
    for (let i = 0; i < weeks; i++) {
      const d = new Date(firstMonday);
      d.setUTCDate(d.getUTCDate() + 7 * i);
      buckets.set(ymd(d), { week_start: ymd(d), volume: 0, reps: 0, sets: 0, workouts: 0 });
    }

    const rows = await all(
      `SELECT w.id AS workout_id, w.date, ws.reps, ws.weight
         FROM workouts w
         JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ? AND date(w.date) >= ?`,
      req.userId,
      ymd(firstMonday)
    );

    const seenWorkoutPerWeek = new Set();
    for (const r of rows) {
      const key = ymd(weekStart(new Date(String(r.date).replace(' ', 'T') + 'Z')));
      const b = buckets.get(key);
      if (!b) continue;
      b.volume += r.reps * r.weight;
      b.reps += r.reps;
      b.sets += 1;
      const wk = `${key}:${r.workout_id}`;
      if (!seenWorkoutPerWeek.has(wk)) {
        seenWorkoutPerWeek.add(wk);
        b.workouts += 1;
      }
    }

    res.json([...buckets.values()]);
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/calendar?days=120
//   One entry per day that has a workout, oldest first:
//   [{ date: 'YYYY-MM-DD', count, label }]
router.get('/stats/calendar', async (req, res, next) => {
  try {
    const days = Math.min(400, Math.max(7, Math.trunc(Number(req.query.days)) || 120));
    const rows = await all(
      `SELECT date(w.date) AS date,
              COUNT(*) AS count,
              COALESCE(MIN(r.name), 'Freestyle') AS label
         FROM workouts w
         LEFT JOIN routines r ON r.id = w.routine_id
        WHERE w.user_id = ? AND date(w.date) >= date('now', '-${days} days')
        GROUP BY date(w.date)
        ORDER BY date(w.date)`,
      req.userId
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
