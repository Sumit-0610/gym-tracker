// Exercise routes.
//
// The exercise library is shared reference data (seeded in seed.js), not
// per-user data — so there is no ownership check here, only authentication.

const express = require('express');
const { get, all } = require('../db');
const requireAuth = require('../middleware/auth');
const { parseId, optionalPositiveInt } = require('../validation');

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
        ORDER BY muscle_group, name`
    );
    res.json(exercises);
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises/:id/last-sets
//   The caller's sets for this exercise from their most recent OTHER workout
//   that contained it — shown while logging as "last time you did this".
//   Query:   ?exclude=<workoutId>  — omit the in-progress workout
//   Returns: 200 { workout_id, date, sets: [{ set_number, reps, weight, set_type }] }
//            200 null  — the user has never logged this exercise before
router.get('/exercises/:id/last-sets', async (req, res, next) => {
  try {
    const exerciseId = parseId(req.params.id);
    if (exerciseId === null) {
      return res.status(404).json({ error: 'exercise not found' });
    }

    const exclude = req.query.exclude === undefined ? undefined : Number(req.query.exclude);
    const err = optionalPositiveInt(exclude, 'exclude');
    if (err) return res.status(400).json({ error: err });

    // The exercise must be a real library row (keeps the response meaningful;
    // an unknown id could otherwise 200-null forever).
    const exercise = await get('SELECT id FROM exercises WHERE id = ?', exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'exercise not found' });
    }

    // Step 1 — the most recent workout of mine (other than `exclude`) that
    // includes this exercise. user_id in the JOIN is the ownership boundary.
    const prev = await get(
      `SELECT w.id, w.date
         FROM workouts w
         JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ? AND ws.exercise_id = ? AND w.id != ?
        ORDER BY w.date DESC, w.id DESC
        LIMIT 1`,
      req.userId,
      exerciseId,
      exclude ?? -1
    );
    if (!prev) return res.json(null);

    // Step 2 — that workout's sets for this exercise. Ownership already proven.
    const sets = await all(
      `SELECT set_number, reps, weight, set_type
         FROM workout_sets
        WHERE workout_id = ? AND exercise_id = ?
        ORDER BY set_number, id`,
      prev.id,
      exerciseId
    );

    res.json({ workout_id: prev.id, date: prev.date, sets });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
