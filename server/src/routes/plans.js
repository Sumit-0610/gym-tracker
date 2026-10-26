// Suggested workout plan routes.
//
// Plans are shared, read-only data (src/plans.js). Starting a plan copies its
// workouts into the caller's own routines, so after that the normal routine
// rules apply: owner is req.userId, never anything from the request.

const express = require('express');
const { all, tx } = require('../db');
const requireAuth = require('../middleware/auth');
const { PLANS, findPlan, routineName, weeklyVolume } = require('../plans');

const router = express.Router();
router.use(requireAuth);

/**
 * The list view: everything except the exercise lists.
 * @param {import('../plans').Plan} p
 */
const summary = (p) => ({
  id: p.id,
  name: p.name,
  level: p.level,
  split: p.split,
  days_per_week: p.days_per_week,
  minutes: p.minutes,
  summary: p.summary,
  workouts: p.workouts.map((w) => ({
    name: w.name,
    focus: w.focus,
    exercise_count: w.exercises.length,
  })),
});

/**
 * Look up library rows for every exercise a plan names, keyed by name.
 * @param {import('../plans').Plan} plan
 */
async function libraryRows(plan) {
  const names = [
    ...new Set(plan.workouts.flatMap((w) => w.exercises.map(([n]) => n))),
  ];
  const rows = await all(
    `SELECT id, name, muscle_group, image_url, video_url
       FROM exercises
      WHERE name IN (${names.map(() => '?').join(', ')})`,
    ...names,
  );
  return new Map(rows.map((r) => [r.name, r]));
}

/**
 * Which of this plan's routine names the user already has.
 * @param {number} userId
 * @param {import('../plans').Plan} plan
 */
async function existingRoutines(userId, plan) {
  const names = plan.workouts.map((w) => routineName(plan, w));
  const rows = await all(
    `SELECT id, name FROM routines
      WHERE user_id = ? AND name IN (${names.map(() => '?').join(', ')})
      ORDER BY id`,
    userId,
    ...names,
  );
  return rows;
}

// GET /api/plans
//   Returns: 200 [{ id, name, level, split, days_per_week, minutes, summary,
//                   workouts: [{ name, focus, exercise_count }] }]
router.get('/plans', (req, res) => {
  res.json(PLANS.map(summary));
});

// GET /api/plans/:id
//   Returns: 200 { ...summary, schedule, progression, based_on, started,
//                  weekly_sets: { <muscle>: { sets, days } },
//                  workouts: [{ name, focus, routine_name,
//                    exercises: [{ id, name, muscle_group, image_url,
//                                  video_url, target_sets, target_reps }] }] }
//            404 unknown plan
//   `started` is true when the caller already has every routine this plan
//   would create (they started it before).
router.get('/plans/:id', async (req, res, next) => {
  try {
    const plan = findPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'plan not found' });

    const [library, existing] = await Promise.all([
      libraryRows(plan),
      existingRoutines(req.userId, plan),
    ]);

    res.json({
      ...summary(plan),
      schedule: plan.schedule,
      progression: plan.progression,
      based_on: plan.based_on,
      weekly_sets: weeklyVolume(
        plan,
        (name) => library.get(name)?.muscle_group,
      ),
      started: existing.length === plan.workouts.length,
      workouts: plan.workouts.map((w) => ({
        name: w.name,
        focus: w.focus,
        routine_name: routineName(plan, w),
        exercises: w.exercises
          .filter(([name]) => library.has(name))
          .map(([name, sets, reps]) => ({
            ...library.get(name),
            target_sets: sets,
            target_reps: reps,
          })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/plans/:id/start
//   Copies the plan into the caller's routines: one routine per workout, named
//   "<plan> · <workout>", with the plan's sets and reps as targets.
//   Returns: 201 { routines: [{ id, name }] }
//            404 unknown plan
//            409 the caller already has routines from this plan
router.post('/plans/:id/start', async (req, res, next) => {
  try {
    const plan = findPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'plan not found' });

    // Starting twice would give duplicate routines with the same names.
    const existing = await existingRoutines(req.userId, plan);
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: 'You already have routines from this plan.' });
    }

    const library = await libraryRows(plan);

    // One transaction for the whole plan, so a failure never leaves half a
    // plan behind. Each routine's exercises point at it with a subquery: inside
    // this write transaction the newest routine for this user is the one just
    // inserted, so we don't need its id ahead of time.
    /** @type {any[][]} */
    const statements = [];
    for (const w of plan.workouts) {
      statements.push([
        'INSERT INTO routines (user_id, name) VALUES (?, ?)',
        req.userId,
        routineName(plan, w),
      ]);
      for (const [name, sets, reps] of w.exercises) {
        const ex = library.get(name);
        if (!ex) continue; // not in this library; the unit test prevents it
        statements.push([
          `INSERT INTO routine_exercises (routine_id, exercise_id, target_sets, target_reps)
           VALUES ((SELECT MAX(id) FROM routines WHERE user_id = ?), ?, ?, ?)`,
          req.userId,
          ex.id,
          sets,
          reps,
        ]);
      }
    }
    await tx(statements);

    const routines = await existingRoutines(req.userId, plan);
    res.status(201).json({
      routines: routines.map((r) => ({ id: Number(r.id), name: r.name })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
