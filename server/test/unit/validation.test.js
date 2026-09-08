'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseId,
  nonEmptyString,
  positiveInt,
  optionalPositiveInt,
  nonNegativeNumber,
  oneOf,
} = require('../../src/validation');

test('parseId — accepts positive integers (incl. numeric strings)', () => {
  assert.equal(parseId('12'), 12);
  assert.equal(parseId(12), 12);
  assert.equal(parseId('1'), 1);
});

test('parseId — rejects everything else', () => {
  for (const bad of [
    '0',
    '-1',
    '1.5',
    'abc',
    '',
    ' ',
    '12abc',
    null,
    undefined,
    NaN,
  ]) {
    assert.equal(parseId(bad), null, `parseId(${JSON.stringify(bad)})`);
  }
});

test('nonEmptyString', () => {
  assert.equal(nonEmptyString('hi', 'name'), null);
  assert.equal(nonEmptyString('  hi  ', 'name'), null);
  assert.equal(nonEmptyString('', 'name'), 'name is required');
  assert.equal(nonEmptyString('   ', 'name'), 'name is required');
  assert.equal(nonEmptyString(5, 'name'), 'name is required');
  assert.equal(nonEmptyString(undefined, 'name'), 'name is required');
  assert.equal(
    nonEmptyString('x'.repeat(101), 'name'),
    'name must be at most 100 characters',
  );
  assert.equal(nonEmptyString('x'.repeat(100), 'name'), null);
  assert.equal(
    nonEmptyString('abcd', 'n', 3),
    'n must be at most 3 characters',
  );
});

test('positiveInt', () => {
  assert.equal(positiveInt(1, 'reps'), null);
  assert.equal(positiveInt(999, 'reps'), null);
  for (const bad of [0, -1, 1.5, '1', null, undefined, NaN, Infinity]) {
    assert.equal(positiveInt(bad, 'reps'), 'reps must be a positive integer');
  }
});

test('optionalPositiveInt — null/undefined pass, otherwise like positiveInt', () => {
  assert.equal(optionalPositiveInt(undefined, 'x'), null);
  assert.equal(optionalPositiveInt(null, 'x'), null);
  assert.equal(optionalPositiveInt(3, 'x'), null);
  assert.equal(optionalPositiveInt(0, 'x'), 'x must be a positive integer');
  assert.equal(optionalPositiveInt('3', 'x'), 'x must be a positive integer');
});

test('nonNegativeNumber — 0 is allowed, negatives / non-numbers are not', () => {
  assert.equal(nonNegativeNumber(0, 'weight'), null);
  assert.equal(nonNegativeNumber(42.5, 'weight'), null);
  for (const bad of [
    -0.1,
    '0',
    '5',
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
  ]) {
    assert.equal(
      nonNegativeNumber(bad, 'weight'),
      'weight must be a number >= 0',
    );
  }
});

test('oneOf', () => {
  const units = ['kg', 'lb'];
  assert.equal(oneOf('kg', 'unit', units), null);
  assert.equal(oneOf('lb', 'unit', units), null);
  assert.equal(oneOf('stone', 'unit', units), 'unit must be one of: kg, lb');
  assert.equal(oneOf(undefined, 'unit', units), 'unit must be one of: kg, lb');
});
