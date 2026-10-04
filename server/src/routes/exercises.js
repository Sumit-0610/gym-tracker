// Exercise routes.
//
// The exercise library is shared reference data (seeded in seed.js), not
// per-user data — so there is no ownership check on the library itself, only
// authentication. Anything that reads the caller's own LOGGED sets (last-sets,
// progress, suggestion) filters on user_id in SQL.

const express = require('express');
const { get, all } = require('../db');
const requireAuth = require('../middleware/auth');
const { parseId, optionalPositiveInt } = require('../validation');
const analytics = require('../analytics');
const { previousSession } = require('../training-data');

const router = express.Router();
router.use(requireAuth);

// GET /api/exercises
//   Auth:     session required
//   Body:     none
//   Returns:  200 [{ id, name, muscle_group }, ...]
//
// SQL notes:
//   - No WHERE clause: every row in the library is public to any logged-in user.
//   - Explicit ORDER BY: SQLite gives no ordering guarantee without one. We sort
//     by muscle_group then name so the response is stable across calls and
//     already grouped for a UI. muscle_group is nullable; NULLs would sort first,
//     but every seeded row has one.
//   - No parameters, so nothing to parameterize — there is no user input in
//     this query at all.
router.get('/exercises', async (req, res, next) => {
  try {
    const exercises = await all(
      `SELECT id, name, muscle_group
         FROM exercises
        ORDER BY muscle_group, name`,
    );
    res.json(exercises);
  } catch (err) {
    next(err);
  }
});

// Parses the :id param and the optional ?exclude=<workoutId>, and loads the
// library row. Sends the error response itself and returns null when invalid.
async function loadExercise(req, res) {
  const exerciseId = parseId(req.params.id);
  if (exerciseId === null) {
    res.status(404).json({ error: 'exercise not found' });
    return null;
  }
  const exclude =
    req.query.exclude === undefined ? undefined : Number(req.query.exclude);
  const err = optionalPositiveInt(exclude, 'exclude');
  if (err) {
    res.status(400).json({ error: err });
    return null;
  }
  // The exercise must be a real library row (keeps the response meaningful;
  // an unknown id could otherwise 200-null forever).
  const exercise = await get(
    'SELECT id, name, muscle_group FROM exercises WHERE id = ?',
    exerciseId,
  );
  if (!exercise) {
    res.status(404).json({ error: 'exercise not found' });
    return null;
  }
  return { exercise, exerciseId, exclude };
}

// GET /api/exercises/:id/last-sets
//   The caller's sets for this exercise from their most recent OTHER workout
//   that contained it — shown while logging as "last time you did this".
//   Query:   ?exclude=<workoutId>  — omit the in-progress workout
//   Returns: 200 { workout_id, date, sets: [{ set_number, reps, weight, set_type, rpe }] }
//            200 null  — the user has never logged this exercise before
router.get('/exercises/:id/last-sets', async (req, res, next) => {
  try {
    const ctx = await loadExercise(req, res);
    if (!ctx) return;
    const prev = await previousSession(req.userId, ctx.exerciseId, ctx.exclude);
    res.json(prev);
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises/:id/suggestion?set=<n>&exclude=<workoutId>
//   A double-progression suggestion for the next set, built from last session
//   (see analytics.suggestNext). Weights are in the user's stored kg; the client
//   converts for display.
//   Returns: 200 { reps, weight_kg, reason, based_on: { workout_id, date } }
//            200 null — nothing logged before, or only warm-ups
router.get('/exercises/:id/suggestion', async (req, res, next) => {
  try {
    const ctx = await loadExercise(req, res);
    if (!ctx) return;

    const rawSet = Number(req.query.set);
    const setNumber =
      Number.isInteger(rawSet) && rawSet > 0 ? Math.min(rawSet, 50) : 1;

    const prev = await previousSession(req.userId, ctx.exerciseId, ctx.exclude);
    if (!prev) return res.json(null);

    const me = await get(
      'SELECT weight_unit FROM users WHERE id = ?',
      req.userId,
    );
    const suggestion = analytics.suggestNext(prev.sets, {
      unit: me && me.weight_unit === 'lb' ? 'lb' : 'kg',
      setNumber,
    });
    if (!suggestion) return res.json(null);

    res.json({
      ...suggestion,
      based_on: { workout_id: prev.workout_id, date: prev.date },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises/:id/progress?limit=<n>
//   The caller's history for one lift, one point per session, for the progress
//   chart and PR list.
//   Returns: 200 {
//     exercise: { id, name, muscle_group },
//     sessions: [{ workout_id, date, best_e1rm, top_weight, volume, sets }]
//                 oldest first, at most `limit` (default 30, max 100),
//     prs: { e1rm, weight, volume } each { value, date } | null,
//     stalled: boolean
//   }
//   Only working sets count (no warm-ups). `date` is the local calendar day.
router.get('/exercises/:id/progress', async (req, res, next) => {
  try {
    const ctx = await loadExercise(req, res);
    if (!ctx) return;

    const rawLimit = Math.trunc(Number(req.query.limit));
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, rawLimit))
      : 30;

    const rows = await all(
      `SELECT w.id AS workout_id,
              date(w.date,'localtime') AS day,
              ws.reps, ws.weight
         FROM workouts w
         JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ? AND ws.exercise_id = ? AND ws.set_type <> 'warmup'
        ORDER BY w.date, w.id, ws.id`,
      req.userId,
      ctx.exerciseId,
    );

    /** @type {Map<number, any>} */
    const byWorkout = new Map();
    for (const r of rows) {
      let s = byWorkout.get(r.workout_id);
      if (!s) {
        s = {
          workout_id: r.workout_id,
          date: r.day,
          sets: [],
        };
        byWorkout.set(r.workout_id, s);
      }
      s.sets.push({ reps: r.reps, weight: r.weight });
    }

    const all_sessions = [...byWorkout.values()].map((s) => {
      const e = analytics.bestE1RM(s.sets);
      return {
        workout_id: s.workout_id,
        date: s.date,
        best_e1rm: e === null ? null : analytics.round1(e),
        top_weight: s.sets.reduce((m, x) => Math.max(m, x.weight), 0),
        volume: s.sets.reduce((t, x) => t + x.reps * x.weight, 0),
        sets: s.sets.length,
      };
    });

    /** @param {string} key */
    const best = (key) => {
      let top = null;
      for (const s of all_sessions) {
        const v = s[key];
        if (v !== null && v > 0 && (top === null || v > top.value)) {
          top = { value: v, date: s.date };
        }
      }
      return top;
    };
    // Single-set volume PR is per set, not per session — compute separately.
    let setVolume = null;
    for (const r of rows) {
      const v = r.reps * r.weight;
      if (v > 0 && (setVolume === null || v > setVolume.value)) {
        setVolume = { value: v, date: r.day };
      }
    }

    const e1rms = all_sessions
      .map((s) => s.best_e1rm)
      .filter((v) => v !== null);

    res.json({
      exercise: ctx.exercise,
      sessions: all_sessions.slice(-limit),
      prs: {
        e1rm: best('best_e1rm'),
        weight: best('top_weight'),
        volume: setVolume,
      },
      stalled: analytics.isStalled(e1rms),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
