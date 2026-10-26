const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EXERCISES } = require('../../src/seed');
const { PLANS, LEVELS, routineName } = require('../../src/plans');

const library = new Set(EXERCISES.map(([name]) => name));

test('every level has at least three plans', () => {
  for (const level of LEVELS) {
    const count = PLANS.filter((p) => p.level === level).length;
    assert.ok(count >= 3, `${level} has ${count} plans`);
  }
});

test('plan ids are unique and every plan has a known level', () => {
  const ids = PLANS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PLANS) assert.ok(LEVELS.includes(p.level), p.id);
});

test('every exercise in a plan exists in the library', () => {
  for (const p of PLANS) {
    for (const w of p.workouts) {
      for (const [name] of w.exercises) {
        assert.ok(library.has(name), `${p.id} / ${w.name}: "${name}"`);
      }
    }
  }
});

test('targets are whole numbers above 0', () => {
  for (const p of PLANS) {
    for (const w of p.workouts) {
      for (const [name, sets, reps] of w.exercises) {
        assert.ok(Number.isInteger(sets) && sets > 0, `${name} sets`);
        assert.ok(Number.isInteger(reps) && reps > 0, `${name} reps`);
      }
    }
  }
});

test('routine names are unique across all plans and fit the 100-char limit', () => {
  const names = PLANS.flatMap((p) => p.workouts.map((w) => routineName(p, w)));
  assert.equal(new Set(names).size, names.length);
  for (const n of names) assert.ok(n.length <= 100, n);
});

test('a plan has no more workouts than training days', () => {
  for (const p of PLANS) {
    assert.ok(p.workouts.length <= p.days_per_week, p.id);
  }
});
