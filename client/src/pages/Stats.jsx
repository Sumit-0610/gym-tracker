import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { formatVolume } from '../format';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Stats.css';

const STATUS_LABEL = {
  low: 'Below range',
  ok: 'In range',
  high: 'Above range',
};

function lastTrained(daysSince) {
  if (daysSince === null) return 'never trained';
  if (daysSince === 0) return 'trained today';
  return `${daysSince}d ago`;
}

// This week's working sets per muscle group against a rough weekly range.
function MuscleBalance() {
  const { data, loading, error, reload } = useApi(() => api.muscleStats(), []);

  return (
    <section aria-labelledby="stats-muscles">
      <h2 id="stats-muscles">This week by muscle</h2>
      {loading && <Spinner label="Loading muscle balance…" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && (
        <Card>
          <ul className="muscle-list">
            {data.muscles.map((m) => {
              const status = m.sets === 0 ? 'none' : m.status;
              const fill = Math.min(100, (m.sets / m.mrv) * 100);
              return (
                <li key={m.muscle_group} className="muscle-row">
                  <div className="muscle-head">
                    <span className="muscle-name">{m.muscle_group}</span>
                    <span className={`muscle-status muscle-${status}`}>
                      {m.sets === 0
                        ? 'Not trained this week'
                        : STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  <div
                    className="muscle-bar"
                    role="img"
                    aria-label={`${m.muscle_group}: ${m.sets} sets this week, suggested ${m.mev} to ${m.mrv}`}
                  >
                    <span
                      className={`muscle-fill muscle-fill-${status}`}
                      style={{ width: `${fill}%` }}
                    />
                    {m.mev > 0 && (
                      <span
                        className="muscle-mark"
                        style={{ left: `${(m.mev / m.mrv) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="muscle-meta">
                    {m.sets} {m.sets === 1 ? 'set' : 'sets'} · aim for {m.mev}–
                    {m.mrv} · {lastTrained(m.days_since)}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="stats-foot">
            Working sets only — warm-ups are excluded. The ranges are rough
            guidelines from popular training advice, not rules or medical
            advice.
          </p>
        </Card>
      )}
    </section>
  );
}

const ROWS = [
  ['Last 7 days', 'last_7_days'],
  ['Last 30 days', 'last_30_days'],
  ['Last 365 days', 'last_365_days'],
  ['All time', 'all_time'],
];

export default function Stats() {
  const { user } = useAuth();
  const unit = user?.weight_unit || 'kg';

  const { data, loading, error, reload } = useApi(() => api.stats(), []);

  if (loading) return <Spinner full label="Loading your stats…" />;
  if (error) {
    return (
      <div className="page">
        <h1>Stats</h1>
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    );
  }

  const noData = data.total_sets === 0;

  return (
    <div className="page">
      <h1>Stats</h1>
      <p className="stats-sub">
        Total weight lifted — each working set’s reps × weight, added up.
        Warm-ups don’t count.
      </p>

      {noData ? (
        <EmptyState title="Nothing logged yet">
          Log a few sets and your training volume will show up here.
        </EmptyState>
      ) : (
        <Card>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Volume</th>
                <th>Workouts</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, key]) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className="stats-num">
                    {formatVolume(data.volume[key], unit)}
                  </td>
                  <td className="stats-num">{data.workouts[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="stats-foot">
            {data.total_sets} {data.total_sets === 1 ? 'set' : 'sets'} logged in
            total. Bodyweight sets don’t add to volume.
          </p>
        </Card>
      )}

      {!noData && <MuscleBalance />}
    </div>
  );
}
