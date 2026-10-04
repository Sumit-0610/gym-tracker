// Small pure helpers for the "coach" features. No React, no network — each one
// is unit-tested (coach.test.js). The numbers themselves (1RM, PRs, suggestions)
// are computed by the server; this file only decides what to show and when to
// ask "did you mean…?".

import { formatWeight } from './format';

/**
 * @typedef {{ reps: number, weight: number, set_type?: string }} LoggedSet
 * @typedef {import('./format').Unit} Unit
 */

/** Warm-ups never count toward volume, set totals or records. */
export const isWorkingSet = (/** @type {{ set_type?: string }} */ s) =>
  s.set_type !== 'warmup';

/**
 * Total weight moved (kg) across the working sets.
 * @param {LoggedSet[]} sets
 * @returns {number}
 */
export function workingVolumeKg(sets) {
  return sets
    .filter(isWorkingSet)
    .reduce((total, s) => total + s.reps * s.weight, 0);
}

/**
 * @param {LoggedSet[]} sets
 * @returns {number}
 */
export const workingSetCount = (sets) => sets.filter(isWorkingSet).length;

/**
 * Catch likely typos before a set is logged. Returns a human-readable question
 * when the entry looks off, or null when it looks fine. This is only a nudge —
 * the user can always log it anyway.
 *
 * Checks, in order: absurd reps, absurd weight, and a weight wildly different
 * from the heaviest working set last time (more than 3x or under a quarter).
 * A warm-up is naturally light, so it skips the comparison with last time.
 *
 * @param {{ reps: number, weightKg: number, previousSets?: LoggedSet[], unit?: Unit, setType?: string }} entry
 * @returns {string | null}
 */
export function checkSetSanity({
  reps,
  weightKg,
  previousSets = [],
  unit = 'kg',
  setType = 'normal',
}) {
  if (reps > 100) {
    return `${reps} reps is a lot — is that right?`;
  }
  if (weightKg > 500) {
    return `${formatWeight(weightKg, unit)} is very heavy — is that right?`;
  }

  const lastTop = previousSets
    .filter(isWorkingSet)
    .reduce((m, s) => Math.max(m, s.weight), 0);
  if (setType !== 'warmup' && lastTop > 0 && weightKg > 0) {
    if (weightKg > lastTop * 3) {
      return (
        `${formatWeight(weightKg, unit)} is more than 3× the ` +
        `${formatWeight(lastTop, unit)} you lifted last time — is that right?`
      );
    }
    if (weightKg < lastTop / 4) {
      return (
        `${formatWeight(weightKg, unit)} is far below the ` +
        `${formatWeight(lastTop, unit)} you lifted last time — is that right?`
      );
    }
  }
  return null;
}

/**
 * @typedef {{ previous: number, current: number }} PrDelta
 * @typedef {{
 *   exercise_id: number,
 *   exercise_name: string,
 *   e1rm: PrDelta | null,
 *   weight: PrDelta | null,
 *   volume: PrDelta | null,
 * }} WorkoutPr
 */

/**
 * One short line per exercise that set a record, leading with the most
 * meaningful kind (estimated 1RM, then heaviest weight, then set volume).
 * @param {WorkoutPr[]} prs
 * @param {Unit} unit
 * @returns {string[]}
 */
export function describePRs(prs, unit = 'kg') {
  return prs.map((p) => {
    if (p.e1rm) {
      return `${p.exercise_name} — est. 1RM ${formatWeight(p.e1rm.current, unit)} (was ${formatWeight(p.e1rm.previous, unit)})`;
    }
    if (p.weight) {
      return `${p.exercise_name} — heaviest set ${formatWeight(p.weight.current, unit)} (was ${formatWeight(p.weight.previous, unit)})`;
    }
    if (p.volume) {
      return `${p.exercise_name} — best set volume up from ${formatWeight(p.volume.previous, unit)} to ${formatWeight(p.volume.current, unit)}`;
    }
    return p.exercise_name;
  });
}

/** Effort choices for the optional RPE field: 6 to 10 in half steps. */
export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
