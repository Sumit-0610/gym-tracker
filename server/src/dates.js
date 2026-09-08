// Small date helpers used by the stats routes. All operate on 'YYYY-MM-DD'
// strings so they are timezone-agnostic — the caller decides which zone
// "today" is in (see routes/stats.js and the Timezone note in V1-STATUS.md).

/**
 * The Monday of the week containing `ymd`.
 * @param {string} ymd - a date as 'YYYY-MM-DD'
 * @returns {string} the Monday of that week, as 'YYYY-MM-DD'
 */
function weekStartOf(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  const mondayOffset = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - mondayOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * `ymd` plus `n` whole days (n may be negative).
 * @param {string} ymd - a date as 'YYYY-MM-DD'
 * @param {number} n
 * @returns {string} 'YYYY-MM-DD'
 */
function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Today's date in the server's timezone. en-CA formats as ISO 'YYYY-MM-DD'.
 * @returns {string}
 */
const localToday = () => new Date().toLocaleDateString('en-CA');

module.exports = { weekStartOf, addDays, localToday };
