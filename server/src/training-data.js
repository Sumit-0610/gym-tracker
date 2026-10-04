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

/**
 * Everything the AI recap needs about one workout: its sets grouped by
 * exercise (in the order first performed), and for each exercise the working
 * sets of every EARLIER workout, grouped per workout, oldest first.
 * @param {number} userId
 * @param {{ id: number, date: string }} workout
 * @returns {Promise<{
 *   rows: any[],
 *   exercises: { name: string, muscle_group: string | null, sets: any[], priorSessions: any[][] }[],
 * }>} rows = this workout's raw sets (for cache fingerprinting)
 */
async function workoutWithHistory(userId, workout) {
  const rows = await all(
    `SELECT ws.id, ws.exercise_id, e.name, e.muscle_group,
            ws.reps, ws.weight, ws.set_type, ws.rpe
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
      WHERE ws.workout_id = ?
      ORDER BY ws.id`,
    workout.id,
  );

  /** @type {Map<number, { name: string, muscle_group: string | null, sets: any[], priorSessions: any[][] }>} */
  const byExercise = new Map();
  for (const r of rows) {
    let e = byExercise.get(r.exercise_id);
    if (!e) {
      e = {
        name: String(r.name),
        muscle_group: r.muscle_group == null ? null : String(r.muscle_group),
        sets: [],
        priorSessions: [],
      };
      byExercise.set(r.exercise_id, e);
    }
    e.sets.push({
      reps: r.reps,
      weight: r.weight,
      set_type: r.set_type,
      rpe: r.rpe,
    });
  }
  if (byExercise.size === 0) return { rows, exercises: [] };

  // Earlier history for every exercise in one query. The ids come from the
  // database, not the request; placeholders keep them bound.
  const ids = [...byExercise.keys()];
  const prior = await all(
    `SELECT ws.exercise_id, ws.workout_id, ws.reps, ws.weight
       FROM workout_sets ws
       JOIN workouts w ON w.id = ws.workout_id
      WHERE w.user_id = ?
        AND ws.exercise_id IN (${ids.map(() => '?').join(',')})
        AND ws.set_type <> 'warmup'
        AND (w.date < ? OR (w.date = ? AND w.id < ?))
      ORDER BY w.date, w.id, ws.id`,
    userId,
    ...ids,
    workout.date,
    workout.date,
    workout.id,
  );
  /** @type {Map<string, any[]>} */
  const sessions = new Map(); // "exercise:workout" -> sets, insertion = oldest first
  for (const r of prior) {
    const key = `${r.exercise_id}:${r.workout_id}`;
    let list = sessions.get(key);
    if (!list) {
      list = [];
      sessions.set(key, list);
      byExercise.get(r.exercise_id)?.priorSessions.push(list);
    }
    list.push({ reps: r.reps, weight: r.weight });
  }

  return { rows, exercises: [...byExercise.values()] };
}

module.exports = {
  previousSession,
  weeklyMuscleCounts,
  lastTrainedByMuscle,
  workoutWithHistory,
};
