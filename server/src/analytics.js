// The "coach": pure, deterministic training analytics. No I/O, no clock — every
// function takes plain data and returns plain data, so each one is unit-tested
// (test/unit/analytics.test.js). Routes fetch rows and call into here.
//
// Conventions
//   - Weights are kilograms, as stored. Callers convert for lb users.
//   - Warm-up sets never count toward anything here (e1RM, PRs, volume, sets).
//   - These are training heuristics, not medical advice. The volume ranges in
//     particular are approximate expert-opinion guidance, not clinical limits.

const { daysBetween } = require('./dates');

/**
 * @typedef {{ reps: number, weight: number, set_type?: string, rpe?: number | null }} SetRow
 * @typedef {'kg' | 'lb'} Unit
 */

const LB_PER_KG = 2.2046226218;

/** @param {{ set_type?: string }} s */
const isWorking = (s) => s.set_type !== 'warmup';

/** @param {number} n */
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Epley estimated one-rep max: weight * (1 + reps/30).
 * Only trusted for 1-12 reps; heavier reps drift badly, so we return null.
 * Bodyweight sets (weight 0) have no meaningful 1RM either.
 * @param {number} weight - kg
 * @param {number} reps
 * @returns {number | null}
 */
function epley1RM(weight, reps) {
  if (!(weight > 0)) return null;
  if (!Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/**
 * Best estimated 1RM across the working sets, or null if none qualifies.
 * @param {SetRow[]} sets
 * @returns {number | null}
 */
function bestE1RM(sets) {
  let best = null;
  for (const s of sets) {
    if (!isWorking(s)) continue;
    const e = epley1RM(s.weight, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

/**
 * @typedef {{ previous: number, current: number }} PrDelta
 * @typedef {{ e1rm: PrDelta | null, weight: PrDelta | null, volume: PrDelta | null }} PrResult
 */

/**
 * Which personal records did `newSets` set against everything in `priorSets`?
 * Three kinds: best estimated 1RM, heaviest working weight, best single-set
 * volume. With no prior history nothing is a PR (the first time you do a lift
 * everything would be one, which is noise).
 * @param {SetRow[]} priorSets
 * @param {SetRow[]} newSets
 * @returns {PrResult}
 */
function computePRs(priorSets, newSets) {
  /** @type {PrResult} */
  const none = { e1rm: null, weight: null, volume: null };
  const prior = priorSets.filter(isWorking);
  const current = newSets.filter(isWorking);
  if (prior.length === 0 || current.length === 0) return none;

  /** @param {number | null} before @param {number | null} after */
  const delta = (before, after) =>
    before !== null && after !== null && after > before
      ? { previous: before, current: after }
      : null;

  const maxOf = (
    /** @type {SetRow[]} */ rows,
    /** @type {(s: SetRow) => number} */ f,
  ) => rows.reduce((m, s) => Math.max(m, f(s)), 0);

  const weightBefore = maxOf(prior, (s) => s.weight);
  const weightAfter = maxOf(current, (s) => s.weight);
  const volBefore = maxOf(prior, (s) => s.reps * s.weight);
  const volAfter = maxOf(current, (s) => s.reps * s.weight);

  return {
    e1rm: delta(bestE1RM(prior), bestE1RM(current)),
    weight: weightBefore > 0 ? delta(weightBefore, weightAfter) : null,
    volume: volBefore > 0 ? delta(volBefore, volAfter) : null,
  };
}

/**
 * @typedef {{
 *   reps: number,
 *   weight_kg: number,
 *   reason: string,
 * }} Suggestion
 */

/**
 * Double progression: keep the weight and add a rep each session until every
 * set at the top weight reaches `repMax`, then add a small load and drop back
 * to `repMin`. If the last session was near max effort (RPE >= 9.5) at the top
 * weight we hold the load instead of adding to it.
 *
 * `setNumber` picks which set of last session to build on (set 3 builds on last
 * time's set 3; beyond the last set it reuses the final working set), so the
 * suggestion differs per set the way the user's last session did.
 *
 * @param {SetRow[]} lastSets - the previous session's sets for this exercise
 * @param {{ unit?: Unit, repMin?: number, repMax?: number, setNumber?: number }} [opts]
 * @returns {Suggestion | null}
 */
function suggestNext(lastSets, opts = {}) {
  const { unit = 'kg', repMin = 8, repMax = 12, setNumber = 1 } = opts;
  const working = lastSets.filter((s) => isWorking(s) && s.reps > 0);
  if (working.length === 0) return null;

  const topWeight = working.reduce((m, s) => Math.max(m, s.weight), 0);
  const atTop = working.filter((s) => s.weight === topWeight);

  // Bodyweight (or weight not recorded): just chase reps.
  if (topWeight === 0) {
    const reps = Math.max(...atTop.map((s) => s.reps)) + 1;
    return {
      reps,
      weight_kg: 0,
      reason: `Bodyweight: last time you managed ${reps - 1}, aim for ${reps}`,
    };
  }

  const hitTop = atTop.every((s) => s.reps >= repMax);
  const nearMax = atTop.some((s) => typeof s.rpe === 'number' && s.rpe >= 9.5);

  if (hitTop && !nearMax) {
    return {
      reps: repMin,
      weight_kg: addLoad(topWeight, unit),
      reason: `All your sets hit ${repMax} reps, so add a little weight`,
    };
  }
  if (hitTop && nearMax) {
    return {
      reps: repMax,
      weight_kg: topWeight,
      reason:
        'Last session was near max effort, so repeat it before adding weight',
    };
  }

  // Build on the matching set from last time (or the last one we have).
  const idx = Math.min(Math.max(setNumber, 1), atTop.length) - 1;
  const base = atTop[idx];
  const reps = Math.min(repMax, base.reps + 1);
  return {
    reps,
    weight_kg: topWeight,
    reason: `Last time ${base.reps} reps at this weight, aim for ${reps}`,
  };
}

/**
 * One load step above `kg`, in the user's own unit so the number is clean on
 * their screen: +2.5 kg, or +5 lb (rounded to a whole pound).
 * @param {number} kg
 * @param {Unit} unit
 * @returns {number} kilograms
 */
function addLoad(kg, unit) {
  if (unit === 'lb') {
    return Math.round(kg * LB_PER_KG + 5) / LB_PER_KG;
  }
  return Math.round((kg + 2.5) * 2) / 2; // nearest 0.5 kg
}

/**
 * Has this lift gone four sessions without a new best? Input is the best
 * estimated 1RM of each session, oldest first. Needs at least five points
 * (something to be stalled relative to). "Stalled" = none of the last four
 * beat the earlier best by at least 1%.
 * @param {number[]} sessionBests
 * @returns {boolean}
 */
function isStalled(sessionBests) {
  if (sessionBests.length < 5) return false;
  const recent = sessionBests.slice(-4);
  const earlier = sessionBests.slice(0, -4);
  const earlierBest = Math.max(...earlier);
  return Math.max(...recent) < earlierBest * 1.01;
}

/**
 * Approximate working-set ranges per muscle group per week, as popularised by
 * volume-landmark guidance (e.g. Renaissance Periodization). They are expert
 * opinion, not experimentally derived, and groups without a widely published
 * figure use deliberately conservative guesses. `mev` = the least that tends
 * to produce progress, `mrv` = roughly the most you can recover from.
 * @type {Record<string, { mev: number, mrv: number }>}
 */
const LANDMARKS = {
  Chest: { mev: 8, mrv: 22 },
  Back: { mev: 8, mrv: 25 },
  Shoulders: { mev: 6, mrv: 22 },
  Quads: { mev: 6, mrv: 20 },
  Hamstrings: { mev: 4, mrv: 16 },
  Glutes: { mev: 4, mrv: 16 },
  Biceps: { mev: 6, mrv: 20 },
  Triceps: { mev: 4, mrv: 18 },
  Calves: { mev: 6, mrv: 20 },
  Core: { mev: 0, mrv: 20 },
  Forearms: { mev: 0, mrv: 12 },
};

/**
 * @typedef {{
 *   muscle_group: string,
 *   sets: number,
 *   mev: number,
 *   mrv: number,
 *   status: 'low' | 'ok' | 'high',
 *   last_trained: string | null,
 *   days_since: number | null,
 * }} MuscleRow
 */

/**
 * Combine this week's working-set counts and each muscle's last-trained day
 * into one row per muscle group, flagged low / ok / high against LANDMARKS.
 * @param {{ counts: Record<string, number>, lastTrained: Record<string, string>, today: string }} input
 * @returns {MuscleRow[]}
 */
function muscleSummary({ counts, lastTrained, today }) {
  return Object.entries(LANDMARKS).map(([muscle, { mev, mrv }]) => {
    const sets = counts[muscle] || 0;
    const last = lastTrained[muscle] || null;
    /** @type {'low' | 'ok' | 'high'} */
    let status = 'ok';
    if (sets > mrv) status = 'high';
    else if (sets < mev) status = 'low';
    return {
      muscle_group: muscle,
      sets,
      mev,
      mrv,
      status,
      last_trained: last,
      days_since: last ? Math.max(0, daysBetween(last, today)) : null,
    };
  });
}

/**
 * Pick the routine whose muscles have had the most rest. A routine's score is
 * the average days-since-trained over its muscle groups (never trained counts
 * as `CAP` days, and everything is capped so one long break doesn't dominate).
 * @param {{ id: number, name: string, muscles: string[] }[]} routines
 * @param {Record<string, number | null>} daysSince - muscle -> days, null = never
 * @returns {{ routine_id: number, name: string, reason: string } | null}
 */
function recommendRoutine(routines, daysSince) {
  const CAP = 14;
  /** @param {string} m */
  const rest = (m) => {
    const d = daysSince[m];
    return d === null || d === undefined ? CAP : Math.min(d, CAP);
  };

  let best = null;
  let bestScore = -1;
  for (const r of routines) {
    const muscles = [...new Set(r.muscles)];
    if (muscles.length === 0) continue;
    const score = muscles.reduce((t, m) => t + rest(m), 0) / muscles.length;
    if (score > bestScore) {
      best = { r, muscles };
      bestScore = score;
    }
  }
  if (!best) return null;

  const mostRested = [...best.muscles]
    .sort((a, b) => rest(b) - rest(a))
    .slice(0, 3)
    .map((m) => {
      const d = daysSince[m];
      return d === null || d === undefined
        ? `${m} (not trained yet)`
        : `${m} (${d}d ago)`;
    });
  return {
    routine_id: best.r.id,
    name: best.r.name,
    reason: `Longest rest: ${mostRested.join(', ')}`,
  };
}

module.exports = {
  LB_PER_KG,
  LANDMARKS,
  round1,
  epley1RM,
  bestE1RM,
  computePRs,
  suggestNext,
  addLoad,
  isStalled,
  muscleSummary,
  recommendRoutine,
};
