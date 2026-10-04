const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LB_PER_KG,
  epley1RM,
  bestE1RM,
  computePRs,
  suggestNext,
  addLoad,
  isStalled,
  muscleSummary,
  recommendRoutine,
} = require('../../src/analytics');

const close = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('epley1RM: formula, single rep, and the cases it refuses', () => {
  close(/** @type {number} */ (epley1RM(100, 5)), 100 * (1 + 5 / 30));
  assert.equal(epley1RM(100, 1), 100); // one rep is the weight itself
  assert.equal(epley1RM(0, 8), null); // bodyweight: no meaningful 1RM
  assert.equal(epley1RM(100, 0), null);
  assert.equal(epley1RM(100, 13), null); // too many reps to trust
  assert.equal(epley1RM(100, 12.5), null); // not a whole number
  assert.notEqual(epley1RM(100, 12), null); // 12 is the upper bound
});

test('bestE1RM ignores warm-ups and unusable sets', () => {
  const sets = [
    { reps: 5, weight: 200, set_type: 'warmup' },
    { reps: 5, weight: 100, set_type: 'normal' },
    { reps: 20, weight: 150, set_type: 'normal' }, // >12 reps -> null
  ];
  close(/** @type {number} */ (bestE1RM(sets)), 100 * (1 + 5 / 30));
  assert.equal(bestE1RM([]), null);
  assert.equal(bestE1RM([{ reps: 5, weight: 100, set_type: 'warmup' }]), null);
});

test('computePRs: no history means no PRs; beating history flags each kind', () => {
  const now = [{ reps: 5, weight: 100 }];
  assert.deepEqual(computePRs([], now), {
    e1rm: null,
    weight: null,
    volume: null,
  });
  assert.deepEqual(computePRs([{ reps: 5, weight: 90 }], []), {
    e1rm: null,
    weight: null,
    volume: null,
  });

  const r = computePRs([{ reps: 5, weight: 90 }], now);
  assert.equal(r.weight?.previous, 90);
  assert.equal(r.weight?.current, 100);
  assert.equal(r.volume?.current, 500);
  assert.ok(r.e1rm && r.e1rm.current > r.e1rm.previous);
});

test('computePRs: matching or losing to history is not a PR; warm-ups ignored', () => {
  const prior = [{ reps: 5, weight: 100 }];
  const same = computePRs(prior, [{ reps: 5, weight: 100 }]);
  assert.deepEqual(same, { e1rm: null, weight: null, volume: null });

  // A heavy warm-up must not count as a PR, nor raise the bar.
  const warm = computePRs(
    [{ reps: 5, weight: 300, set_type: 'warmup' }, ...prior],
    [{ reps: 5, weight: 105 }],
  );
  assert.equal(warm.weight?.previous, 100);
  assert.equal(
    computePRs(prior, [{ reps: 5, weight: 500, set_type: 'warmup' }]).weight,
    null,
  );
});

test('computePRs: bodyweight history has no weight/volume PR', () => {
  const r = computePRs([{ reps: 10, weight: 0 }], [{ reps: 12, weight: 0 }]);
  assert.deepEqual(r, { e1rm: null, weight: null, volume: null });
});

test('suggestNext: no usable history -> null', () => {
  assert.equal(suggestNext([]), null);
  assert.equal(
    suggestNext([{ reps: 5, weight: 40, set_type: 'warmup' }]),
    null,
  );
});

test('suggestNext: adds a rep when the top of the range has not been reached', () => {
  const last = [
    { reps: 10, weight: 60 },
    { reps: 9, weight: 60 },
    { reps: 8, weight: 60 },
  ];
  assert.deepEqual(suggestNext(last, { setNumber: 1 }), {
    reps: 11,
    weight_kg: 60,
    reason: 'Last time 10 reps at this weight, aim for 11',
  });
  // set 3 builds on last time's set 3; beyond the last set reuses the final one
  assert.equal(suggestNext(last, { setNumber: 3 })?.reps, 9);
  assert.equal(suggestNext(last, { setNumber: 9 })?.reps, 9);
});

test('suggestNext: adds load (kg) once every top set hits repMax', () => {
  const last = [
    { reps: 12, weight: 60 },
    { reps: 12, weight: 60 },
  ];
  const s = suggestNext(last);
  assert.equal(s?.weight_kg, 62.5);
  assert.equal(s?.reps, 8);
});

test('suggestNext: lb users get a clean +5 lb step', () => {
  const kg135lb = 135 / LB_PER_KG;
  const s = suggestNext([{ reps: 12, weight: kg135lb }], { unit: 'lb' });
  close(/** @type {number} */ (s?.weight_kg) * LB_PER_KG, 140, 1e-6);
});

test('suggestNext: near-max effort holds the load instead of adding to it', () => {
  const s = suggestNext([{ reps: 12, weight: 60, rpe: 10 }]);
  assert.equal(s?.weight_kg, 60);
  assert.match(String(s?.reason), /repeat/);
});

test('suggestNext: only sets at the top weight drive the decision', () => {
  // back-off set at lower weight must not block progression of the top weight
  const s = suggestNext([
    { reps: 12, weight: 100 },
    { reps: 6, weight: 80 },
  ]);
  assert.equal(s?.weight_kg, 102.5);
});

test('suggestNext: bodyweight just chases reps, uncapped', () => {
  const s = suggestNext([{ reps: 15, weight: 0 }]);
  assert.equal(s?.weight_kg, 0);
  assert.equal(s?.reps, 16);
});

test('addLoad rounds sensibly in each unit', () => {
  assert.equal(addLoad(60, 'kg'), 62.5);
  assert.equal(addLoad(61.2, 'kg'), 63.5); // nearest 0.5
  close(addLoad(100 / LB_PER_KG, 'lb') * LB_PER_KG, 105, 1e-6);
});

test('isStalled: needs five points, then asks "any new best in the last four?"', () => {
  assert.equal(isStalled([]), false);
  assert.equal(isStalled([100, 100, 100, 100]), false); // too few points
  assert.equal(isStalled([100, 100, 100, 100, 100]), true); // flat
  assert.equal(isStalled([100, 100.5, 99, 98, 99]), true); // <1% above 100
  assert.equal(isStalled([100, 90, 90, 90, 102]), false); // recent best > 1% up
  assert.equal(isStalled([100, 105, 110, 115, 120]), false); // climbing
});

test('muscleSummary flags low / ok / high and days since', () => {
  const rows = muscleSummary({
    counts: { Chest: 3, Back: 10, Quads: 30 },
    lastTrained: { Chest: '2026-10-01', Back: '2026-10-04' },
    today: '2026-10-04',
  });
  const by = Object.fromEntries(rows.map((r) => [r.muscle_group, r]));
  assert.equal(by.Chest.status, 'low'); // 3 < MEV 8
  assert.equal(by.Chest.days_since, 3);
  assert.equal(by.Back.status, 'ok');
  assert.equal(by.Back.days_since, 0);
  assert.equal(by.Quads.status, 'high'); // 30 > MRV
  assert.equal(by.Quads.days_since, null); // never trained
  assert.equal(by.Core.status, 'ok'); // MEV 0, none logged -> not "low"
});

test('recommendRoutine: most-rested muscles win; null when nothing to pick', () => {
  const routines = [
    { id: 1, name: 'Push', muscles: ['Chest', 'Shoulders', 'Triceps'] },
    { id: 2, name: 'Pull', muscles: ['Back', 'Biceps'] },
  ];
  const r = recommendRoutine(routines, {
    Chest: 1,
    Shoulders: 1,
    Triceps: 1,
    Back: 6,
    Biceps: 6,
  });
  assert.equal(r?.routine_id, 2);
  assert.match(String(r?.reason), /Back \(6d ago\)/);

  // never-trained counts as fully rested (capped), so it beats a 6-day gap
  const never = recommendRoutine(routines, {
    Chest: 6,
    Shoulders: 6,
    Triceps: 6,
    Back: 6,
  });
  assert.equal(never?.routine_id, 2);
  assert.match(String(never?.reason), /not trained yet/);

  assert.equal(recommendRoutine([], {}), null);
  assert.equal(
    recommendRoutine([{ id: 1, name: 'Empty', muscles: [] }], {}),
    null,
  );
});

test('recommendRoutine: ties go to the first routine', () => {
  const r = recommendRoutine(
    [
      { id: 5, name: 'A', muscles: ['Chest'] },
      { id: 6, name: 'B', muscles: ['Back'] },
    ],
    { Chest: 3, Back: 3 },
  );
  assert.equal(r?.routine_id, 5);
});
