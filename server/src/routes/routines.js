// Routine routes.
//
// A routine is user-owned data. The rule for every handler below:
//   - the owner is req.userId (from the session) — never from the request body
//   - reads and writes filter on user_id IN SQL, so another user's rows are
//     never even selected

const express = require('express');
const { get, all, run } = require('../db');
const requireAuth = require('../middleware/auth');
const {
  parseId,
  nonEmptyString,
  positiveInt,
  optionalPositiveInt,
} = require('../validation');

const router = express.Router();

// Applies to every route in this file. One line here beats remembering to add
// requireAuth to each handler.
router.use(requireAuth);

// POST /api/routines
//   Body:    { name }
//   Returns: 201 { id, name }
router.post('/routines', async (req, res, next) => {
  try {
    const { name } = req.body || {};
    const err = nonEmptyString(name, 'name');
    if (err) return res.status(400).json({ error: err });

    // user_id is req.userId, full stop. If the client also sent {"user_id": 5}
    // it is ignored — the routine belongs to whoever is logged in.
    const info = await run(
      'INSERT INTO routines (user_id, name) VALUES (?, ?)',
      req.userId,
      name.trim()
    );

    res.status(201).json({ id: Number(info.lastInsertRowid), name: name.trim() });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines
//   Returns: 200 [{ id, name }]  (only the caller's routines)
router.get('/routines', async (req, res, next) => {
  try {
    // `WHERE user_id = ?` is the authorization boundary. There is no code path
    // that returns a row this query didn't select.
    const routines = await all(
      'SELECT id, name FROM routines WHERE user_id = ? ORDER BY name',
      req.userId
    );
    res.json(routines);
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id
//   Returns: 200 { id, name, exercises: [{ id, name, muscle_group,
//                                          target_sets, target_reps }] }
//            404 if the routine doesn't exist OR isn't the caller's
router.get('/routines/:id', async (req, res, next) => {
  try {
    const routineId = parseId(req.params.id);
    if (routineId === null) {
      return res.status(404).json({ error: 'routine not found' });
    }

    // Step 1 — fetch + authorize in one query. No row => doesn't exist or not
    // yours; we return 404 for both so the response can't be used to probe which
    // routine IDs exist.
    const routine = await get(
      'SELECT id, name FROM routines WHERE id = ? AND user_id = ?',
      routineId,
      req.userId
    );
    if (!routine) {
      return res.status(404).json({ error: 'routine not found' });
    }

    // Step 2 — the routine's exercises. No further ownership check needed: step 1
    // already proved the caller owns routineId, and we only filter by that id.
    //
    // JOIN: routine_exercises is a link table. It holds exercise_id plus the
    // per-routine targets, but not the exercise's name/muscle_group (those live
    // once in `exercises`). `JOIN exercises e ON e.id = re.exercise_id` pairs
    // each link row with its exercise row so the response has readable fields.
    // ORDER BY re.id keeps exercises in the order they were added.
    const exercises = await all(
      `SELECT e.id, e.name, e.muscle_group,
              re.target_sets, re.target_reps
         FROM routine_exercises re
         JOIN exercises e ON e.id = re.exercise_id
        WHERE re.routine_id = ?
        ORDER BY re.id`,
      routineId
    );

    res.json({ ...routine, exercises });
  } catch (err) {
    next(err);
  }
});

// POST /api/routines/:id/exercises
//   Body:    { exercise_id, target_sets?, target_reps? }
//   Returns: 201 { id, routine_id, exercise_id, target_sets, target_reps }
//            400 bad body / unknown exercise_id
//            404 routine not found or not the caller's
router.post('/routines/:id/exercises', async (req, res, next) => {
  try {
    const routineId = parseId(req.params.id);
    if (routineId === null) {
      return res.status(404).json({ error: 'routine not found' });
    }

    const { exercise_id, target_sets, target_reps } = req.body || {};
    const err =
      positiveInt(exercise_id, 'exercise_id') ||
      optionalPositiveInt(target_sets, 'target_sets') ||
      optionalPositiveInt(target_reps, 'target_reps');
    if (err) return res.status(400).json({ error: err });

    // Ownership check in SQL, before any write.
    const routine = await get(
      'SELECT id FROM routines WHERE id = ? AND user_id = ?',
      routineId,
      req.userId
    );
    if (!routine) {
      return res.status(404).json({ error: 'routine not found' });
    }

    // The exercise must be a real library row. The INSERT's foreign key would
    // reject a bad id anyway, but as a 500; this turns it into a clear 400.
    const exercise = await get('SELECT id FROM exercises WHERE id = ?', exercise_id);
    if (!exercise) {
      return res.status(400).json({ error: 'exercise_id does not exist' });
    }

    // Duplicates allowed on purpose — a routine can list the same exercise twice.
    // No transaction: this is a single INSERT. The two checks above are reads
    // against tables with no delete endpoint in v1, so nothing can vanish
    // between the check and the write.
    const info = await run(
      `INSERT INTO routine_exercises (routine_id, exercise_id, target_sets, target_reps)
       VALUES (?, ?, ?, ?)`,
      routineId,
      exercise_id,
      target_sets ?? null,
      target_reps ?? null
    );

    res.status(201).json({
      id: Number(info.lastInsertRowid),
      routine_id: routineId,
      exercise_id,
      target_sets: target_sets ?? null,
      target_reps: target_reps ?? null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
