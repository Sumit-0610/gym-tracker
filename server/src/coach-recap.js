// AI Coach Recap: turns one finished workout into the facts an LLM narrates.
//
// The split is deliberate. Everything numeric (PRs, estimated 1RM, stalls,
// weekly sets per muscle) is computed here by the tested rules in
// analytics.js. The LLM only gets those facts as JSON and is told to use
// nothing else, so it explains the numbers rather than inventing them.
//
// Pure functions, no I/O: routes/recap.js fetches the rows and calls in here.
// Only numbers, exercise names and muscle groups go into the prompt, never the
// username or any id.

const {
  LB_PER_KG,
  round1,
  bestE1RM,
  computePRs,
  isStalled,
} = require('./analytics');

/**
 * @typedef {import('./analytics').SetRow} SetRow
 * @typedef {import('./analytics').Unit} Unit
 * @typedef {import('./analytics').MuscleRow} MuscleRow
 * @typedef {{
 *   name: string,
 *   muscle_group: string | null,
 *   sets: SetRow[],
 *   priorSessions: SetRow[][],
 * }} ExerciseInput
 */

/**
 * @param {Unit} unit
 * @returns {(kg: number) => number} kg -> the user's unit, one decimal
 */
const toUnit = (unit) => (kg) => round1(unit === 'lb' ? kg * LB_PER_KG : kg);

/** @param {{ set_type?: string }} s */
const isWorking = (s) => s.set_type !== 'warmup';

/**
 * Build the recap facts for one workout.
 * @param {{ unit: Unit, exercises: ExerciseInput[], muscles: MuscleRow[] }} input
 *   exercises — in the order performed; priorSessions oldest first, each the
 *   working sets of one earlier workout. muscles — analytics.muscleSummary().
 */
function buildRecapFacts({ unit, exercises, muscles }) {
  const conv = toUnit(unit);
  let totalSets = 0;
  let totalVolume = 0;

  const exerciseFacts = [];
  for (const ex of exercises) {
    const working = ex.sets.filter(isWorking);
    if (working.length === 0) continue;
    totalSets += working.length;
    totalVolume += working.reduce((t, s) => t + s.reps * s.weight, 0);

    const top = working.reduce((a, b) =>
      b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a,
    );
    const prior = ex.priorSessions.flat();
    const prs = computePRs(prior, working);
    const prList = [];
    if (prs.e1rm) {
      prList.push(
        `estimated 1-rep max ${conv(prs.e1rm.previous)} -> ${conv(prs.e1rm.current)} ${unit}`,
      );
    }
    if (prs.weight) {
      prList.push(
        `heaviest weight ${conv(prs.weight.previous)} -> ${conv(prs.weight.current)} ${unit}`,
      );
    }
    if (prs.volume) {
      prList.push(
        `best single set (reps x weight) ${conv(prs.volume.previous)} -> ${conv(prs.volume.current)}`,
      );
    }

    const sessionBests = [...ex.priorSessions, working]
      .map((s) => bestE1RM(s))
      .filter((v) => v !== null);
    const rpes = working.map((s) => s.rpe).filter((r) => typeof r === 'number');

    const best = bestE1RM(working);
    exerciseFacts.push({
      name: ex.name,
      muscle_group: ex.muscle_group,
      working_sets: working.length,
      reps: working.map((s) => s.reps),
      top_set:
        top.weight > 0
          ? `${conv(top.weight)} ${unit} x ${top.reps}`
          : `bodyweight x ${top.reps}`,
      estimated_1rm: best === null ? null : conv(best),
      first_time: ex.priorSessions.length === 0,
      new_records: prList,
      stalled: isStalled(/** @type {number[]} */ (sessionBests)),
      average_effort_rpe:
        rpes.length > 0
          ? round1(rpes.reduce((t, r) => t + r, 0) / rpes.length)
          : null,
    });
  }

  const trainedToday = new Set(exerciseFacts.map((e) => e.muscle_group));
  const range = (/** @type {MuscleRow} */ m) => `${m.mev}-${m.mrv}`;
  return {
    unit,
    total_working_sets: totalSets,
    total_volume: Math.round(conv(totalVolume)),
    exercises: exerciseFacts,
    // Weekly working sets so far (week starts Monday) for the muscles worked
    // today, against the recommended range.
    muscles_worked_this_week: muscles
      .filter((m) => trainedToday.has(m.muscle_group))
      .map((m) => ({
        muscle: m.muscle_group,
        sets_this_week: m.sets,
        recommended_range: range(m),
        status: m.status,
      })),
    // Muscle groups trained before but not in the last 7+ days.
    neglected_muscles: muscles
      .filter((m) => m.days_since !== null && m.days_since >= 7)
      .map((m) => ({ muscle: m.muscle_group, days_since: m.days_since })),
  };
}

const SYSTEM_PROMPT = `You are a friendly, concise strength coach inside a workout-tracking app.
You write a short recap of the workout the user just finished.

Rules:
- Use ONLY the facts in the JSON you are given. Never invent numbers, exercises, history or trends.
- Plain text, 3 to 5 short sentences, second person ("you"). No headings, no lists, no markdown, at most one emoji.
- Open with the highlight: a new record if there is one, otherwise the main lift or the total work done.
- Then give one or two specific, practical suggestions drawn from the facts: a stalled lift (suggest a small change such as a different rep range or a deload), a muscle below or above its weekly range, or a muscle group not trained for a week or more.
- If first_time is true for an exercise, say it sets a baseline rather than calling it a record.
- Say things plainly: "estimated 1-rep max", not "e1RM"; "effort", not "RPE".
- No medical, injury, diet or supplement advice.`;

/**
 * The prompt pair for ai.generateText().
 * @param {ReturnType<typeof buildRecapFacts>} facts
 * @returns {{ system: string, user: string }}
 */
function buildRecapPrompt(facts) {
  return {
    system: SYSTEM_PROMPT,
    user: `Facts about the workout I just finished (weights in ${facts.unit}):\n${JSON.stringify(facts)}`,
  };
}

module.exports = { buildRecapFacts, buildRecapPrompt, SYSTEM_PROMPT };
