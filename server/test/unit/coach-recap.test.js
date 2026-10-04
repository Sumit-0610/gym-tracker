const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRecapFacts, buildRecapPrompt } = require('../../src/coach-recap');

/** @param {string} muscle_group @param {number} sets @param {number | null} days_since */
const muscle = (muscle_group, sets, days_since, status = 'ok') => ({
  muscle_group,
  sets,
  mev: 8,
  mrv: 22,
  status: /** @type {'low' | 'ok' | 'high'} */ (status),
  last_trained: null,
  days_since,
});

test('buildRecapFacts: totals, top set and PRs, warm-ups ignored', () => {
  const facts = buildRecapFacts({
    unit: 'kg',
    exercises: [
      {
        name: 'Bench Press',
        muscle_group: 'Chest',
        sets: [
          { reps: 10, weight: 40, set_type: 'warmup' },
          { reps: 5, weight: 80, set_type: 'normal', rpe: 8 },
          { reps: 5, weight: 80, set_type: 'normal', rpe: 9 },
        ],
        priorSessions: [[{ reps: 5, weight: 75 }]],
      },
    ],
    muscles: [muscle('Chest', 2, 0), muscle('Back', 0, 9, 'low')],
  });

  assert.equal(facts.total_working_sets, 2);
  assert.equal(facts.total_volume, 800);
  const bench = facts.exercises[0];
  assert.equal(bench.top_set, '80 kg x 5');
  assert.equal(bench.first_time, false);
  assert.equal(bench.average_effort_rpe, 8.5);
  assert.deepEqual(bench.reps, [5, 5]);
  assert.ok(
    bench.new_records.some((r) => r.startsWith('heaviest weight 75 -> 80')),
  );
  // only muscles worked today in the weekly list; long-untrained ones flagged
  assert.deepEqual(
    facts.muscles_worked_this_week.map((m) => m.muscle),
    ['Chest'],
  );
  assert.deepEqual(facts.neglected_muscles, [
    { muscle: 'Back', days_since: 9 },
  ]);
});

test('buildRecapFacts: first time is a baseline, not a record', () => {
  const facts = buildRecapFacts({
    unit: 'kg',
    exercises: [
      {
        name: 'Squat',
        muscle_group: 'Quads',
        sets: [{ reps: 5, weight: 100 }],
        priorSessions: [],
      },
    ],
    muscles: [],
  });
  assert.equal(facts.exercises[0].first_time, true);
  assert.deepEqual(facts.exercises[0].new_records, []);
});

test('buildRecapFacts: converts to lb and flags a stalled lift', () => {
  const same = [{ reps: 5, weight: 100 }];
  const facts = buildRecapFacts({
    unit: 'lb',
    exercises: [
      {
        name: 'Deadlift',
        muscle_group: 'Back',
        sets: same,
        priorSessions: [same, same, same, same],
      },
    ],
    muscles: [],
  });
  const dl = facts.exercises[0];
  assert.equal(dl.top_set, '220.5 lb x 5');
  assert.equal(dl.stalled, true);
  assert.equal(facts.total_volume, 1102);
});

test('buildRecapFacts: exercises with only warm-ups are left out', () => {
  const facts = buildRecapFacts({
    unit: 'kg',
    exercises: [
      {
        name: 'Row',
        muscle_group: 'Back',
        sets: [{ reps: 10, weight: 20, set_type: 'warmup' }],
        priorSessions: [],
      },
    ],
    muscles: [],
  });
  assert.equal(facts.total_working_sets, 0);
  assert.deepEqual(facts.exercises, []);
});

test('buildRecapPrompt: grounds the model in the facts, no personal data', () => {
  const facts = buildRecapFacts({
    unit: 'kg',
    exercises: [
      {
        name: 'Bench Press',
        muscle_group: 'Chest',
        sets: [{ reps: 5, weight: 80 }],
        priorSessions: [],
      },
    ],
    muscles: [],
  });
  const { system, user } = buildRecapPrompt(facts);
  assert.match(system, /ONLY the facts/);
  assert.match(user, /Bench Press/);
  assert.deepEqual(JSON.parse(user.slice(user.indexOf('{'))), facts);
});
