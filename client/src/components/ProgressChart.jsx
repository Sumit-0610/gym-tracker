import { formatWeight, formatDay } from '../format';
import './ProgressChart.css';

// A small hand-drawn SVG line chart: one point per session, oldest on the left.
// No chart library — same approach as ActivityChart.
//
// `points` is [{ date: 'YYYY-MM-DD', value: number }] with values in kg; the
// y-axis labels are converted for the user's unit. Sessions without a value
// (e.g. only sets above 12 reps, which have no 1RM estimate) are skipped by
// the caller.

const VB_W = 320;
const VB_H = 140;
const PAD = { top: 12, right: 12, bottom: 22, left: 12 };

export default function ProgressChart({ points, unit = 'kg', label }) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A flat line (one point, or no change) still needs a non-zero span to scale.
  const span = hi - lo || Math.max(1, hi * 0.1);
  const innerW = VB_W - PAD.left - PAD.right;
  const innerH = VB_H - PAD.top - PAD.bottom;

  const x = (i) =>
    PAD.left +
    (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - ((v - lo) / span) * innerH;

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join(' ');

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="progress-chart">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`${label}: from ${formatWeight(first.value, unit)} to ${formatWeight(last.value, unit)} over ${points.length} sessions`}
      >
        <path d={path} className="progress-chart-line" fill="none" />
        {points.map((p, i) => (
          <circle
            key={`${p.date}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r="3.5"
            className="progress-chart-dot"
          >
            <title>{`${formatDay(p.date)} — ${formatWeight(p.value, unit)}`}</title>
          </circle>
        ))}
        <text x={PAD.left} y={VB_H - 6} className="progress-chart-axis">
          {formatDay(first.date)}
        </text>
        <text
          x={VB_W - PAD.right}
          y={VB_H - 6}
          textAnchor="end"
          className="progress-chart-axis"
        >
          {formatDay(last.date)}
        </text>
      </svg>
      <figcaption className="progress-chart-range">
        Low {formatWeight(lo, unit)} · High {formatWeight(hi, unit)}
      </figcaption>
    </figure>
  );
}
