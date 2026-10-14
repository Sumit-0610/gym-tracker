// Date-range presets for the data export (Settings → Export data). Pure, so
// they are unit-tested; all dates are 'YYYY-MM-DD' strings.

/** `ymd` plus `n` whole days (n may be negative). */
export function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const PRESETS = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

/**
 * The { from, to } a preset covers, ending today.
 * @param {string} id - one of PRESETS' ids
 * @param {string} today - 'YYYY-MM-DD'
 * @param {string} [since] - account creation timestamp, for 'all'
 */
export function presetRange(id, today, since) {
  switch (id) {
    case '30d':
      return { from: addDays(today, -29), to: today };
    case '90d':
      return { from: addDays(today, -89), to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default: {
      // created_at is a UTC timestamp; a day earlier covers any timezone.
      const start = /^\d{4}-\d{2}-\d{2}/.test(since || '')
        ? addDays(since.slice(0, 10), -1)
        : '2000-01-01';
      return { from: start < today ? start : today, to: today };
    }
  }
}
