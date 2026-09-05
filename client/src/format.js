// Presentation helpers — how we display values, never how we store them.

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
