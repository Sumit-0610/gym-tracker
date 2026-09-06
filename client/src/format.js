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
