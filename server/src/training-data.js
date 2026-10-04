// The SQL behind the coach (analytics.js): small, read-only queries shared by
// several routes. Every one filters on user_id in SQL — that is the ownership
// boundary, same as the route files. Warm-up sets are excluded wherever the
// result feeds a "how hard did I train" number.

const { get, all } = require('./db');

/**
 * The caller's most recent workout (other than `excludeId`) containing the
 * exercise, with that workout's sets for it.
 * @param {number} userId
 * @param {number} exerciseId
 * @param {number | undefined} excludeId - e.g. the in-progress workout
 * @returns {Promise<{ workout_id: number, date: string, sets: any[] } | null>}
 */
async function previousSession(userId, exerciseId, excludeId) {
  const prev = await get(
    `SELECT w.id, w.date
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.user_id = ? AND ws.exercise_id = ? AND w.id != ?
      ORDER BY w.date DESC, w.id DESC
      LIMIT 1`,
    userId,
    exerciseId,
    excludeId ?? -1,
  );
  if (!prev) return null;

  const sets = await all(
    `SELECT set_number, reps, weight, set_type, rpe
       FROM workout_sets
      WHERE workout_id = ? AND exercise_id = ?
      ORDER BY set_number, id`,
    prev.id,
    exerciseId,
  );
  return { workout_id: prev.id, date: prev.date, sets };
}

/**
 * Working sets per muscle group since `weekStart` (a local 'YYYY-MM-DD').
 * @param {number} userId
 * @param {string} weekStart
 * @returns {Promise<Record<string, number>>}
 */
async function weeklyMuscleCounts(userId, weekStart) {
  const rows = await all(
    `SELECT e.muscle_group, COUNT(ws.id) AS sets
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id
       JOIN exercises e     ON e.id = ws.exercise_id
      WHERE w.user_id = ?
        AND ws.set_type <> 'warmup'
        AND date(w.date,'localtime') >= ?
      GROUP BY e.muscle_group`,
    userId,
    weekStart,
  );
  /** @type {Record<string, number>} */
  const out = {};
  for (const r of rows) {
    if (r.muscle_group) out[String(r.muscle_group)] = Number(r.sets);
  }
  return out;
}

/**
 * The most recent local day each muscle group was trained (working sets).
 * @param {number} userId
 * @returns {Promise<Record<string, string>>}
 */
async function lastTrainedByMuscle(userId) {
  const rows = await all(
    `SELECT e.muscle_group, MAX(date(w.date,'localtime')) AS last_day
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id
       JOIN exercises e     ON e.id = ws.exercise_id
      WHERE w.user_id = ? AND ws.set_type <> 'warmup'
      GROUP BY e.muscle_group`,
    userId,
  );
  /** @type {Record<string, string>} */
  const out = {};
  for (const r of rows) {
    if (r.muscle_group && r.last_day) {
      out[String(r.muscle_group)] = String(r.last_day);
    }
  }
  return out;
}

module.exports = { previousSession, weeklyMuscleCounts, lastTrainedByMuscle };
