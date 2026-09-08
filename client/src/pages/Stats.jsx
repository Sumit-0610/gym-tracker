import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { formatVolume } from '../format';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Stats.css';

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
        Total weight lifted — every set’s reps × weight, added up.
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
    </div>
  );
}
