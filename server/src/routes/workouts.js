// Workout routes: logging (Phase 9) and history (Phase 10).
//
// A workout is user-owned. Same rule as routines: the owner is req.userId from
// the session, and every query filters on user_id in SQL.

const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const {
  parseId,
  positiveInt,
  optionalPositiveInt,
  nonNegativeNumber,
} = require('../validation');

const router = express.Router();
router.use(requireAuth);

// POST /api/workouts
//   Body:    { routine_id? }   — omit it for a freestyle workout
//   Returns: 201 { id, routine_id, date }
router.post('/workouts', (req, res) => {
  const { routine_id } = req.body || {};
  const err = optionalPositiveInt(routine_id, 'routine_id');
  if (err) return res.status(400).json({ error: err });

  // routine_id is nullable in the schema. If one was given, it must be one of
  // the caller's own routines — you can't start a workout "from" someone
  // else's routine.
  if (routine_id != null) {
    const routine = db
      .prepare('SELECT id FROM routines WHERE id = ? AND user_id = ?')
      .get(routine_id, req.userId);
    if (!routine) {
      return res.status(400).json({ error: 'routine_id does not exist' });
    }
  }

  const info = db
    .prepare('INSERT INTO workouts (user_id, routine_id) VALUES (?, ?)')
    .run(req.userId, routine_id ?? null);

  // Read the row back so the response includes the DB-generated timestamp.
  const workout = db
    .prepare('SELECT id, routine_id, date FROM workouts WHERE id = ?')
    .get(Number(info.lastInsertRowid));

  res.status(201).json(workout);
});

// POST /api/workouts/:id/sets
//   Body:    { exercise_id, set_number, reps, weight }
//   Returns: 201 { id, workout_id, exercise_id, set_number, reps, weight }
//            400 bad body / unknown exercise_id
//            404 workout not found or not the caller's
router.post('/workouts/:id/sets', (req, res) => {
  const workoutId = parseId(req.params.id);
  if (workoutId === null) {
    return res.status(404).json({ error: 'workout not found' });
  }

  const { exercise_id, set_number, reps, weight } = req.body || {};
  const err =
    positiveInt(exercise_id, 'exercise_id') ||
    positiveInt(set_number, 'set_number') ||
    positiveInt(reps, 'reps') ||
    nonNegativeNumber(weight, 'weight'); // 0 is allowed (bodyweight exercise)
  if (err) return res.status(400).json({ error: err });

  // Ownership check, in SQL, before the INSERT. A POST to
  // /api/workouts/<another-user's-id>/sets matches no row here and returns 404
  // — execution never reaches the INSERT, so that workout is never modified.
  const workout = db
    .prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?')
    .get(workoutId, req.userId);
  if (!workout) {
    return res.status(404).json({ error: 'workout not found' });
  }

  // The exercise must be a real library row (the FK would reject a bad id as a
  // 500 otherwise). Note we deliberately do NOT require the exercise to be part
  // of the workout's routine — adding an off-plan exercise mid-session is normal.
  const exercise = db
    .prepare('SELECT id FROM exercises WHERE id = ?')
    .get(exercise_id);
  if (!exercise) {
    return res.status(400).json({ error: 'exercise_id does not exist' });
  }

  const info = db
    .prepare(
      `INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(workoutId, exercise_id, set_number, reps, weight);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    workout_id: workoutId,
    exercise_id,
    set_number,
    reps,
    weight,
  });
});

module.exports = router;
