import { useState } from 'react';
import { formatVolume } from '../format';
import './ActivityChart.css';

// A small hand-drawn SVG bar chart of weekly training activity. No chart
// library — the shape is simple and inline SVG keeps it theme-aware.
//
// `weeks` is the /api/stats/weekly array (oldest first). The Volume / Reps /
// Sets toggle picks which number each bar represents.

const METRICS = [
  ['volume', 'Volume'],
  ['reps', 'Reps'],
  ['sets', 'Sets'],
];

const VB_W = 320;
const VB_H = 120;
const PAD_B = 16; // room for the x labels

export default function ActivityChart({ weeks, unit = 'kg' }) {
  const [metric, setMetric] = useState('volume');

  const values = weeks.map((w) => (metric === 'volume' ? w.volume : w[metric]));
  const max = Math.max(1, ...values);
  const n = weeks.length;
  const gap = 3;
  const barW = (VB_W - gap * (n - 1)) / n;

  const fmt = (v) =>
    metric === 'volume' ? formatVolume(v, unit) : `${Math.round(v)} ${metric}`;

  // three evenly spaced x labels (first, middle, last week)
  const labelIdx = [0, Math.floor(n / 2), n - 1];
  const shortDate = (iso) => {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const total = values.reduce((t, v) => t + v, 0);

  return (
    <div className="activity-chart">
      <div className="activity-chart-head">
        <span className="activity-chart-total">
          {fmt(total)}{' '}
          <span className="activity-chart-total-sub">last {n} weeks</span>
        </span>
        <div
          className="activity-chart-toggle"
          role="tablist"
          aria-label="Metric"
        >
          {METRICS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metric === key}
              className={metric === key ? 'is-active' : ''}
              onClick={() => setMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <svg
        className="activity-chart-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Weekly ${metric}, ${fmt(total)} over ${n} weeks`}
      >
        {weeks.map((w, i) => {
          const v = values[i];
          const h = (v / max) * (VB_H - PAD_B);
          const x = i * (barW + gap);
          const y = VB_H - PAD_B - h;
          return (
            <rect
              key={w.week_start}
              x={x}
              y={y}
              width={barW}
              height={Math.max(v > 0 ? 2 : 0, h)}
              rx="1.5"
              className="activity-chart-bar"
            >
              <title>{`${shortDate(w.week_start)} — ${fmt(v)}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="activity-chart-xlabels">
        {labelIdx.map((i) => (
          <span key={i}>{shortDate(weeks[i].week_start)}</span>
        ))}
      </div>
    </div>
  );
}
