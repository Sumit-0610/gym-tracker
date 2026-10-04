// Tiny validation helpers.
//
// Convention: each validator returns `null` when the value is acceptable, or a
// human-readable error string when it is not. Routes chain them with `||` and
// return the first error as a 400:
//
//   const err = positiveInt(a, 'a') || nonEmptyString(b, 'b');
//   if (err) return res.status(400).json({ error: err });
//
// No schema library — for this project the rules are short and reading them
// inline is more valuable than the indirection.

// URL params always arrive as strings ("/routines/:id" -> "12"). Returns the
// number, or null if it isn't a positive integer.
function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function nonEmptyString(value, field, max = 100) {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${field} is required`;
  }
  if (value.trim().length > max) {
    return `${field} must be at most ${max} characters`;
  }
  return null;
}

function positiveInt(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    return `${field} must be a positive integer`;
  }
  return null;
}

function optionalPositiveInt(value, field) {
  if (value === undefined || value === null) return null;
  return positiveInt(value, field);
}

// Accepts 0 and positive values (e.g. a bodyweight exercise logged at weight 0).
function nonNegativeNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return `${field} must be a number >= 0`;
  }
  return null;
}

// Value must be one of a fixed set of strings (e.g. a set_type or a unit).
function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

// Optional perceived effort: absent/null is fine; otherwise 6..10 in 0.5 steps.
function optionalRpe(value, field) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 6 ||
    value > 10 ||
    !Number.isInteger(value * 2)
  ) {
    return `${field} must be a number from 6 to 10 in steps of 0.5`;
  }
  return null;
}

module.exports = {
  parseId,
  optionalRpe,
  nonEmptyString,
  positiveInt,
  optionalPositiveInt,
  nonNegativeNumber,
  oneOf,
};
