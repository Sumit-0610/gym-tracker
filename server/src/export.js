// Data export: the caller's workouts, sets and bodyweight log for a date range,
// as CSV (one row per set, for a spreadsheet) or JSON (everything, nested).
//
// The pure helpers (parseRange, toCsv, toJson) are unit-tested; loadExport is
// the one function that touches the database (required lazily, so the unit
// tests can load this file without opening one).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FORMATS = ['csv', 'json'];
const LB_PER_KG = 2.2046226218; // same factor as client/src/format.js

/** True for a real calendar date 'YYYY-MM-DD' (rejects 2026-02-30). */
function isRealDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Validate an export request's range + format.
 * @param {{ from?: unknown, to?: unknown, format?: unknown }} input
 * @returns {{ error: string } | { from: string, to: string, format: 'csv' | 'json' }}
 */
function parseRange({ from, to, format = 'csv' }) {
  if (!isRealDate(from) || !isRealDate(to)) {
    return { error: 'from and to must be dates as YYYY-MM-DD' };
  }
  if (from > to) return { error: 'from must be on or before to' };
  if (!FORMATS.includes(/** @type {string} */ (format))) {
    return { error: `format must be one of: ${FORMATS.join(', ')}` };
  }
  return {
    from: /** @type {string} */ (from),
    to: /** @type {string} */ (to),
    format: /** @type {'csv' | 'json'} */ (format),
  };
}

/** kg -> the user's unit, rounded to 2 decimals; null stays null. */
function convert(kg, unit) {
  if (kg === null || kg === undefined) return null;
  const n = unit === 'lb' ? kg * LB_PER_KG : kg;
  return Math.round(n * 100) / 100;
}

/** One CSV field: quoted when it contains a comma, quote or newline. */
function csvField(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // A leading =, +, - or @ makes Excel/Sheets run the cell as a formula.
  // Routine names are user-typed, so neutralise that (but leave numbers alone).
  if (/^[=+\-@]/.test(s) && typeof value !== 'number') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_COLUMNS = [
  'date',
  'workout_id',
  'routine',
  'exercise',
  'muscle_group',
  'set_number',
  'set_type',
  'reps',
  'weight',
  'unit',
  'rpe',
];

/**
 * One row per logged set, oldest first.
 * @param {ExportData} data
 * @returns {string}
 */
function toCsv({ unit, workouts }) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const w of workouts) {
    for (const s of w.sets) {
      lines.push(
        [
          w.date,
          w.id,
          w.routine,
          s.exercise,
          s.muscle_group,
          s.set_number,
          s.set_type,
          s.reps,
          s.weight,
          unit,
          s.rpe,
        ]
          .map(csvField)
          .join(','),
      );
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/** @param {ExportData} data */
const toJson = (data) => JSON.stringify(data, null, 2) + '\n';

/**
 * @typedef {{
 *   from: string, to: string, unit: 'kg' | 'lb',
 *   workouts: { id: number, date: string, completed: boolean,
 *               routine: string | null,
 *               sets: { exercise: string, muscle_group: string | null,
 *                       set_number: number, set_type: string, reps: number,
 *                       weight: number | null, rpe: number | null }[] }[],
 *   measurements: { date: string, weight: number }[]
 * }} ExportData
 */

/**
 * Everything the caller logged between `from` and `to` (inclusive, by local
 * calendar day — the same 'localtime' rule the stats routes use). Weights come
 * back in the caller's preferred unit.
 * @param {number} userId
 * @param {string} from
 * @param {string} to
 * @returns {Promise<ExportData>}
 */
async function loadExport(userId, from, to) {
  const { all, get } = require('./db');
  const user = await get('SELECT weight_unit FROM users WHERE id = ?', userId);
  const unit = user?.weight_unit === 'lb' ? 'lb' : 'kg';

  const [setRows, workoutRows, measurementRows] = await Promise.all([
    all(
      `SELECT ws.workout_id, e.name AS exercise, e.muscle_group,
              ws.set_number, ws.set_type, ws.reps, ws.weight, ws.rpe
         FROM workout_sets ws
         JOIN workouts w ON w.id = ws.workout_id
         JOIN exercises e ON e.id = ws.exercise_id
        WHERE w.user_id = ?
          AND date(w.date,'localtime') BETWEEN ? AND ?
        ORDER BY w.date, w.id, ws.set_number, ws.id`,
      userId,
      from,
      to,
    ),
    all(
      `SELECT w.id, date(w.date,'localtime') AS date, w.completed_at,
              r.name AS routine
         FROM workouts w
         LEFT JOIN routines r ON r.id = w.routine_id
        WHERE w.user_id = ?
          AND date(w.date,'localtime') BETWEEN ? AND ?
        ORDER BY w.date, w.id`,
      userId,
      from,
      to,
    ),
    all(
      `SELECT date, weight FROM measurements
        WHERE user_id = ? AND date BETWEEN ? AND ?
        ORDER BY date`,
      userId,
      from,
      to,
    ),
  ]);

  const workouts = workoutRows.map((w) => ({
    id: Number(w.id),
    date: w.date,
    completed: w.completed_at !== null,
    routine: w.routine ?? null,
    sets: [],
  }));
  const byId = new Map(workouts.map((w) => [w.id, w]));
  for (const s of setRows) {
    byId.get(Number(s.workout_id))?.sets.push({
      exercise: s.exercise,
      muscle_group: s.muscle_group ?? null,
      set_number: s.set_number,
      set_type: s.set_type,
      reps: s.reps,
      weight: convert(s.weight, unit),
      rpe: s.rpe ?? null,
    });
  }

  return {
    from,
    to,
    unit,
    workouts,
    measurements: measurementRows.map((m) => ({
      date: m.date,
      weight: convert(m.weight, unit),
    })),
  };
}

/** The download's filename, e.g. gym-tracker-2026-09-01-to-2026-09-30.csv */
const exportFilename = (from, to, format) =>
  `gym-tracker-${from}-to-${to}.${format}`;

module.exports = {
  parseRange,
  toCsv,
  toJson,
  loadExport,
  exportFilename,
  csvField,
  convert,
};
