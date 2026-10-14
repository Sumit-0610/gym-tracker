'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseRange,
  toCsv,
  toJson,
  csvField,
  convert,
  exportFilename,
} = require('../../src/export');

test('parseRange — accepts a valid range, csv by default', () => {
  assert.deepEqual(parseRange({ from: '2026-09-01', to: '2026-09-30' }), {
    from: '2026-09-01',
    to: '2026-09-30',
    format: 'csv',
  });
  assert.deepEqual(
    parseRange({ from: '2026-09-01', to: '2026-09-01', format: 'json' }),
    { from: '2026-09-01', to: '2026-09-01', format: 'json' },
  );
});

test('parseRange — rejects bad dates, reversed ranges and formats', () => {
  assert.ok('error' in parseRange({ from: '2026-9-1', to: '2026-09-30' }));
  assert.ok('error' in parseRange({ from: '2026-02-30', to: '2026-03-01' }));
  assert.ok('error' in parseRange({ to: '2026-03-01' }));
  assert.ok('error' in parseRange({ from: ['2026-01-01'], to: '2026-03-01' }));
  assert.match(
    /** @type {any} */ (parseRange({ from: '2026-09-30', to: '2026-09-01' }))
      .error,
    /on or before/,
  );
  assert.ok(
    'error' in
      parseRange({ from: '2026-09-01', to: '2026-09-30', format: 'xlsx' }),
  );
});

test('csvField — quotes commas/quotes/newlines, blanks null', () => {
  assert.equal(csvField('Push Day'), 'Push Day');
  assert.equal(csvField('Push, Pull'), '"Push, Pull"');
  assert.equal(csvField('The "big" one'), '"The ""big"" one"');
  assert.equal(csvField('a\nb'), '"a\nb"');
  assert.equal(csvField(null), '');
  assert.equal(csvField(undefined), '');
  assert.equal(csvField(0), '0');
});

test('csvField — neutralises spreadsheet formulas in text, not numbers', () => {
  assert.equal(csvField('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvField('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvField(-2.5), '-2.5');
});

test('convert — kg passes through, lb converts, both round to 2 dp', () => {
  assert.equal(convert(62.5, 'kg'), 62.5);
  assert.equal(convert(100, 'lb'), 220.46);
  assert.equal(convert(null, 'lb'), null);
});

const data = /** @type {const} */ ({
  from: '2026-09-01',
  to: '2026-09-30',
  unit: 'kg',
  workouts: [
    {
      id: 7,
      date: '2026-09-02',
      completed: true,
      routine: 'Push, heavy',
      sets: [
        {
          exercise: 'Barbell Bench Press',
          muscle_group: 'Chest',
          set_number: 1,
          set_type: 'warmup',
          reps: 10,
          weight: 40,
          rpe: null,
        },
        {
          exercise: 'Barbell Bench Press',
          muscle_group: 'Chest',
          set_number: 2,
          set_type: 'normal',
          reps: 8,
          weight: 62.5,
          rpe: 8.5,
        },
      ],
    },
    { id: 8, date: '2026-09-04', completed: false, routine: null, sets: [] },
  ],
  measurements: [{ date: '2026-09-02', weight: 80.1 }],
});

test('toCsv — header plus one row per set, CRLF line endings', () => {
  const lines = toCsv(/** @type {any} */ (data)).split('\r\n');
  assert.equal(
    lines[0],
    'date,workout_id,routine,exercise,muscle_group,set_number,set_type,reps,weight,unit,rpe',
  );
  assert.equal(
    lines[1],
    '2026-09-02,7,"Push, heavy",Barbell Bench Press,Chest,1,warmup,10,40,kg,',
  );
  assert.equal(
    lines[2],
    '2026-09-02,7,"Push, heavy",Barbell Bench Press,Chest,2,normal,8,62.5,kg,8.5',
  );
  assert.equal(lines.length, 4); // header, 2 sets, trailing empty
  assert.equal(lines[3], '');
});

test('toJson — round-trips the whole export', () => {
  assert.deepEqual(JSON.parse(toJson(/** @type {any} */ (data))), data);
});

test('exportFilename', () => {
  assert.equal(
    exportFilename('2026-09-01', '2026-09-30', 'csv'),
    'gym-tracker-2026-09-01-to-2026-09-30.csv',
  );
});
