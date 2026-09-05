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

module.exports = {
  parseId,
  nonEmptyString,
  positiveInt,
  optionalPositiveInt,
  nonNegativeNumber,
};
