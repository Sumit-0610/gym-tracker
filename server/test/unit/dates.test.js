'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { weekStartOf, addDays, localToday } = require('../../src/dates');

test('weekStartOf — snaps to the Monday of that week', () => {
  // 2026-09-09 is a Wednesday; its Monday is 2026-09-07.
  assert.equal(weekStartOf('2026-09-09'), '2026-09-07');
  assert.equal(weekStartOf('2026-09-07'), '2026-09-07'); // Monday -> itself
  assert.equal(weekStartOf('2026-09-13'), '2026-09-07'); // Sunday -> back to Mon
  assert.equal(weekStartOf('2026-09-14'), '2026-09-14'); // next Monday
});

test('weekStartOf — crosses month and year boundaries', () => {
  // 2026-01-01 is a Thursday; Monday is 2025-12-29.
  assert.equal(weekStartOf('2026-01-01'), '2025-12-29');
  // 2026-03-01 is a Sunday; Monday is 2026-02-23.
  assert.equal(weekStartOf('2026-03-01'), '2026-02-23');
});

test('addDays — forward, backward, across boundaries', () => {
  assert.equal(addDays('2026-09-08', 1), '2026-09-09');
  assert.equal(addDays('2026-09-08', -1), '2026-09-07');
  assert.equal(addDays('2026-09-08', -7), '2026-09-01');
  assert.equal(addDays('2026-09-01', -1), '2026-08-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-09-08', 0), '2026-09-08');
});

test('addDays composes for the streak walk (12 weeks back)', () => {
  let cur = '2026-09-07';
  for (let i = 0; i < 12; i++) cur = addDays(cur, -7);
  assert.equal(cur, '2026-06-15');
});

test('localToday — ISO shape', () => {
  assert.match(localToday(), /^\d{4}-\d{2}-\d{2}$/);
});
