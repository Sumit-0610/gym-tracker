import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './History.css';

export default function History() {
  const navigate = useNavigate();

  // GET /api/workouts -> [{ id, date, routine_name, set_count }].
  // A pure query: no side effects, safe to re-fetch (reload) any time.
  const { data: workouts, loading, error, reload } = useApi(
    () => api.workouts(),
    []
  );

  return (
    <div className="page">
      <h1>History</h1>

      {loading && <Spinner label="Loading your workouts…" />}

      {!loading && error && <ErrorMessage error={error} onRetry={reload} />}

      {/* Zero workouts is valid data, not an error. */}
      {!loading && !error && workouts && workouts.length === 0 && (
        <EmptyState title="No workouts yet">
          Your logged workouts will show up here.
          <div>
            <Button onClick={() => navigate('/workout')}>Start a workout</Button>
          </div>
        </EmptyState>
      )}

      {!loading && !error && workouts && workouts.length > 0 && (
        // Rendered in the exact order the server returned (date DESC, id DESC).
        // No client-side sort — the API owns the ordering.
        <ul className="history-list">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link to={`/history/${w.id}`} className="history-row">
                <span className="history-top">
                  <span className="history-name">
                    {w.routine_name || 'Freestyle'}
                  </span>
                  <span className="history-count">
                    {w.set_count} {w.set_count === 1 ? 'set' : 'sets'}
                  </span>
                </span>
                <span className="history-date">{formatDate(w.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
