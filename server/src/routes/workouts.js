// Workout routes: logging (Phase 9) and history (Phase 10).
//
// A workout is user-owned. Same rule as routines: the owner is req.userId from
// the session, and every query filters on user_id in SQL.

const express = require('express');
const { get, all, run, tx } = require('../db');
const requireAuth = require('../middleware/auth');
const {
  parseId,
  positiveInt,
  optionalPositiveInt,
  nonNegativeNumber,
  oneOf,
} = require('../validation');

const router = express.Router();
router.use(requireAuth);

// The kinds of set a user can log. 'normal' is the default when none is given.
const SET_TYPES = ['normal', 'warmup', 'dropset', 'failure'];

// POST /api/workouts
//   Body:    { routine_id? }   — omit it for a freestyle workout
//   Returns: 201 { id, routine_id, date }
router.post('/workouts', async (req, res, next) => {
  try {
    const { routine_id } = req.body || {};
    const err = optionalPositiveInt(routine_id, 'routine_id');
    if (err) return res.status(400).json({ error: err });

    // routine_id is nullable in the schema. If one was given, it must be one of
    // the caller's own routines — you can't start a workout "from" someone
    // else's routine.
    if (routine_id != null) {
      const routine = await get(
        'SELECT id FROM routines WHERE id = ? AND user_id = ?',
        routine_id,
        req.userId
      );
      if (!routine) {
        return res.status(400).json({ error: 'routine_id does not exist' });
      }
    }

    const info = await run(
      'INSERT INTO workouts (user_id, routine_id) VALUES (?, ?)',
      req.userId,
      routine_id ?? null
    );

    // Read the row back so the response includes the DB-generated timestamp.
    const workout = await get(
      'SELECT id, routine_id, date, completed_at FROM workouts WHERE id = ?',
      Number(info.lastInsertRowid)
    );

    res.status(201).json(workout);
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/:id/sets
//   Body:    { exercise_id, set_number, reps, weight, set_type? }
//            set_type defaults to 'normal'; weight is in kilograms.
//   Returns: 201 { id, workout_id, exercise_id, set_number, reps, weight, set_type }
//            400 bad body / unknown exercise_id
//            404 workout not found or not the caller's
router.post('/workouts/:id/sets', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    const { exercise_id, set_number, reps, weight } = req.body || {};
    const set_type = (req.body && req.body.set_type) ?? 'normal';
    const err =
      positiveInt(exercise_id, 'exercise_id') ||
      positiveInt(set_number, 'set_number') ||
      positiveInt(reps, 'reps') ||
      nonNegativeNumber(weight, 'weight') || // 0 is allowed (bodyweight exercise)
      oneOf(set_type, 'set_type', SET_TYPES);
    if (err) return res.status(400).json({ error: err });

    // Ownership check, in SQL, before the INSERT. A POST to
    // /api/workouts/<another-user's-id>/sets matches no row here and returns 404
    // — execution never reaches the INSERT, so that workout is never modified.
    const workout = await get(
      'SELECT id FROM workouts WHERE id = ? AND user_id = ?',
      workoutId,
      req.userId
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }

    // The exercise must be a real library row (the FK would reject a bad id as a
    // 500 otherwise). Note we deliberately do NOT require the exercise to be part
    // of the workout's routine — adding an off-plan exercise mid-session is normal.
    const exercise = await get('SELECT id FROM exercises WHERE id = ?', exercise_id);
    if (!exercise) {
      return res.status(400).json({ error: 'exercise_id does not exist' });
    }

    const info = await run(
      `INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, set_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      workoutId,
      exercise_id,
      set_number,
      reps,
      weight,
      set_type
    );

    res.status(201).json({
      id: Number(info.lastInsertRowid),
      workout_id: workoutId,
      exercise_id,
      set_number,
      reps,
      weight,
      set_type,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/:id/finish
//   Marks a workout complete (sets completed_at). Idempotent — finishing an
//   already-finished workout just returns it. Logging more sets afterwards is
//   still allowed; it does not un-finish the workout.
//   Returns: 200 { id, routine_id, date, completed_at }
//            404 workout not found or not the caller's
router.post('/workouts/:id/finish', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    const workout = await get(
      'SELECT id, completed_at FROM workouts WHERE id = ? AND user_id = ?',
      workoutId,
      req.userId
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }

    if (!workout.completed_at) {
      await run(
        'UPDATE workouts SET completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        workoutId
      );
    }

    const updated = await get(
      'SELECT id, routine_id, date, completed_at FROM workouts WHERE id = ?',
      workoutId
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/:id/reopen
//   Clears completed_at — undoes a "Finish" done by mistake. Idempotent.
//   Returns: 200 { id, routine_id, date, completed_at }  (completed_at now null)
//            404 workout not found or not the caller's
router.post('/workouts/:id/reopen', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    const workout = await get(
      'SELECT id FROM workouts WHERE id = ? AND user_id = ?',
      workoutId,
      req.userId
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }

    await run(
      'UPDATE workouts SET completed_at = NULL WHERE id = ?',
      workoutId
    );

    const updated = await get(
      'SELECT id, routine_id, date, completed_at FROM workouts WHERE id = ?',
      workoutId
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/workouts/:id/sets/:setId
//   Body:    any of { reps, weight, set_type } — at least one.
//            The exercise a set belongs to cannot be changed (delete + re-add).
//   Returns: 200 { id, workout_id, exercise_id, set_number, reps, weight, set_type }
//            400 nothing to update / a field is invalid
//            404 the set doesn't exist, or its workout isn't the caller's
router.patch('/workouts/:id/sets/:setId', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    const setId = parseId(req.params.setId);
    if (workoutId === null || setId === null) {
      return res.status(404).json({ error: 'set not found' });
    }

    const { reps, weight, set_type } = req.body || {};
    const updates = [];
    const args = [];

    if (reps !== undefined) {
      const err = positiveInt(reps, 'reps');
      if (err) return res.status(400).json({ error: err });
      updates.push('reps = ?');
      args.push(reps);
    }
    if (weight !== undefined) {
      const err = nonNegativeNumber(weight, 'weight');
      if (err) return res.status(400).json({ error: err });
      updates.push('weight = ?');
      args.push(weight);
    }
    if (set_type !== undefined) {
      const err = oneOf(set_type, 'set_type', SET_TYPES);
      if (err) return res.status(400).json({ error: err });
      updates.push('set_type = ?');
      args.push(set_type);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }

    // Ownership: the set's workout must be the caller's, and the :id in the path
    // must be that workout. One query proves all of it.
    const owned = await get(
      `SELECT ws.id
         FROM workout_sets ws
         JOIN workouts w ON w.id = ws.workout_id
        WHERE ws.id = ? AND ws.workout_id = ? AND w.user_id = ?`,
      setId,
      workoutId,
      req.userId
    );
    if (!owned) {
      return res.status(404).json({ error: 'set not found' });
    }

    args.push(setId);
    // The column names in `updates` are literals from this file, never input.
    await run(`UPDATE workout_sets SET ${updates.join(', ')} WHERE id = ?`, ...args);

    const updated = await get(
      `SELECT id, workout_id, exercise_id, set_number, reps, weight, set_type
         FROM workout_sets WHERE id = ?`,
      setId
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workouts/:id/sets/:setId
//   Removes one set, then closes the gap: the remaining sets for that exercise
//   in that workout are renumbered so set_number stays 1..n (the client derives
//   "next set number" from the count, so a gap would cause a collision).
//   Returns: 200 { ok: true }
//            404 the set doesn't exist, or its workout isn't the caller's
router.delete('/workouts/:id/sets/:setId', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    const setId = parseId(req.params.setId);
    if (workoutId === null || setId === null) {
      return res.status(404).json({ error: 'set not found' });
    }

    const set = await get(
      `SELECT ws.id, ws.exercise_id, ws.set_number
         FROM workout_sets ws
         JOIN workouts w ON w.id = ws.workout_id
        WHERE ws.id = ? AND ws.workout_id = ? AND w.user_id = ?`,
      setId,
      workoutId,
      req.userId
    );
    if (!set) {
      return res.status(404).json({ error: 'set not found' });
    }

    await tx([
      ['DELETE FROM workout_sets WHERE id = ?', setId],
      [
        `UPDATE workout_sets SET set_number = set_number - 1
          WHERE workout_id = ? AND exercise_id = ? AND set_number > ?`,
        workoutId,
        set.exercise_id,
        set.set_number,
      ],
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workouts/:id
//   Removes a workout and all of its sets, as one transaction.
//   Returns: 200 { ok: true }
//            404 workout not found or not the caller's
router.delete('/workouts/:id', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    const workout = await get(
      'SELECT id FROM workouts WHERE id = ? AND user_id = ?',
      workoutId,
      req.userId
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }

    // Sets first (they reference the workout), then the workout — atomically,
    // so a failure can't leave orphaned sets. There is no ON DELETE CASCADE on
    // the foreign key, so the order matters and the transaction guarantees it.
    await tx([
      ['DELETE FROM workout_sets WHERE workout_id = ?', workoutId],
      ['DELETE FROM workouts WHERE id = ?', workoutId],
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Phase 10 — history
// ---------------------------------------------------------------------------

// GET /api/workouts?limit=&offset=
//   Returns: 200 [{ id, date, completed_at, routine_name, set_count }] newest first
//   limit  1..100  (default 20; out-of-range values are clamped, not rejected)
//   offset >= 0     (default 0)
//
// One query, not "list workouts then fetch sets for each" (that would be 1 + N
// queries). The joins + GROUP BY do it in a single round trip:
//   - LEFT JOIN routines: routine_id is NULL for freestyle workouts; a plain
//     JOIN would drop those rows. LEFT JOIN keeps them with routine_name = NULL.
//   - LEFT JOIN workout_sets: a workout with no sets yet must still appear.
//     COUNT(ws.id) counts non-NULL ids, so "no sets" -> 0 (not 1).
//   - GROUP BY w.id: the sets join produces one row per set; grouping collapses
//     them back to one row per workout. Selecting w.date / r.name alongside the
//     aggregate is well-defined here because we group by the workouts primary key.
//   LIMIT/OFFSET page the result. The response shape is unchanged (a bare
//   array); the client asks for the next page when it received a full one.
const PAGE_DEFAULT = 20;
const PAGE_MAX = 100;

router.get('/workouts', async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(PAGE_MAX, Math.max(1, Math.trunc(rawLimit)))
      : PAGE_DEFAULT;
    const offset =
      Number.isFinite(rawOffset) && rawOffset > 0 ? Math.trunc(rawOffset) : 0;

    const workouts = await all(
      `SELECT w.id,
              w.date,
              w.completed_at,
              r.name AS routine_name,
              COUNT(ws.id) AS set_count
         FROM workouts w
         LEFT JOIN routines r      ON r.id = w.routine_id
         LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ?
        GROUP BY w.id
        ORDER BY w.date DESC, w.id DESC
        LIMIT ? OFFSET ?`,
      req.userId,
      limit,
      offset
    );
    res.json(workouts);
  } catch (err) {
    next(err);
  }
});

// GET /api/workouts/current
//   The caller's most recent unfinished workout (completed_at IS NULL), so a
//   bare /workout screen can offer to resume it instead of starting fresh.
//   Returns: 200 { id, routine_id, date } | 200 null
//   Registered before /workouts/:id so "current" is not read as an id.
router.get('/workouts/current', async (req, res, next) => {
  try {
    const workout = await get(
      `SELECT id, routine_id, date
         FROM workouts
        WHERE user_id = ? AND completed_at IS NULL
        ORDER BY date DESC, id DESC
        LIMIT 1`,
      req.userId
    );
    res.json(workout ?? null);
  } catch (err) {
    next(err);
  }
});

// GET /api/workouts/:id
//   Returns: 200 { id, date, routine_id, routine_name, sets: [
//                    { id, exercise_id, exercise_name, muscle_group,
//                      set_number, reps, weight } ] }
//            404 if the workout doesn't exist OR isn't the caller's
router.get('/workouts/:id', async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    // Query 1 — authorize + metadata. `AND w.user_id = ?` is the ownership gate;
    // no row => 404 (exists-but-not-yours is indistinguishable from doesn't-exist).
    const workout = await get(
      `SELECT w.id, w.date, w.completed_at, w.routine_id, r.name AS routine_name
         FROM workouts w
         LEFT JOIN routines r ON r.id = w.routine_id
        WHERE w.id = ? AND w.user_id = ?`,
      workoutId,
      req.userId
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }

    // Query 2 — the sets. Safe without another ownership check: query 1 proved
    // the caller owns workoutId, and we filter only by that id. JOIN (not LEFT)
    // to exercises because every set has a valid exercise_id (enforced on insert
    // and by the foreign key).
    const sets = await all(
      `SELECT ws.id,
              ws.exercise_id,
              e.name AS exercise_name,
              e.muscle_group,
              ws.set_number,
              ws.reps,
              ws.weight,
              ws.set_type
         FROM workout_sets ws
         JOIN exercises e ON e.id = ws.exercise_id
        WHERE ws.workout_id = ?
        ORDER BY ws.id`,
      workoutId
    );

    res.json({ ...workout, sets });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
