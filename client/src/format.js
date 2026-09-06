// Presentation helpers — how we display values, never how we store them.

// Turn an ApiError into a human sentence. Branches on the HTTP status CODE
// (the stable contract), never on the server's message text. Auth screens map
// 401/409 to their own copy before falling back to this.
export function describeError(error) {
  switch (error?.status) {
    case 0:
      return 'Could not reach the server. Check your connection and try again.';
    case 400:
      return error.message || 'That request was not valid.';
    case 401:
      return 'Your session has ended. Please sign in again.';
    case 404:
      return 'This item no longer exists, or you do not have access to it.';
    case 409:
      return error.message || 'That already exists.';
    case 429:
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 500:
      return 'Something went wrong on the server. Please try again.';
    default:
      return error?.message || 'An unexpected error occurred.';
  }
}

// --- weight units -----------------------------------------------------------
//
// Weights are ALWAYS stored in kilograms (workout_sets.weight). A user whose
// preference is 'lb' sees and types pounds; we convert at the edges — display
// with formatWeight, input with toKg. 0 is "bodyweight" in either unit.
//
// 1 kg = 2.2046226218 lb (exact-enough). Rounding display to 1 decimal makes
// the round-trip lossless to the eye: type "135" lb -> store 61.235 kg ->
// show "135 lb".

const LB_PER_KG = 2.2046226218;
const round1 = (n) => Math.round(n * 10) / 10;

// kg (from the API) -> a display string in the user's unit.
export function formatWeight(kg, unit = 'kg') {
  if (kg === 0) return 'bodyweight';
  return unit === 'lb' ? `${round1(kg * LB_PER_KG)} lb` : `${round1(kg)} kg`;
}

// a number the user typed in their unit -> kg, for sending to the API.
export function toKg(value, unit = 'kg') {
  const n = Number(value);
  return unit === 'lb' ? n / LB_PER_KG : n;
}

// kg -> a number in the user's unit, for pre-filling an input.
export function fromKg(kg, unit = 'kg') {
  return unit === 'lb' ? round1(kg * LB_PER_KG) : round1(kg);
}

// 'warmup' -> 'Warm-up', etc. 'normal' has no label (it's the default).
const SET_TYPE_LABELS = {
  warmup: 'Warm-up',
  dropset: 'Drop set',
  failure: 'To failure',
};
export function setTypeLabel(type) {
  return SET_TYPE_LABELS[type] || '';
}

// The backend stores workout dates as SQLite CURRENT_TIMESTAMP: a UTC string
// "YYYY-MM-DD HH:MM:SS" with no timezone marker. We append 'Z' so the browser
// parses it as UTC, then render it in the viewer's local timezone via
// toLocaleString. There is no per-user timezone setting in v1 — the display
// simply follows the device. The stored value is never changed.
export function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(String(raw).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
