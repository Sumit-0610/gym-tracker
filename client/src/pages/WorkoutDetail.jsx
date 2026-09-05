import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import SetList from './SetList';
import './WorkoutDetail.css';

// `id` is the route param from "/history/:id" — always a string.
export default function WorkoutDetail({ id }) {
  const navigate = useNavigate();

  // Everything on this page is rebuilt from this one GET. Nothing depends on
  // earlier React state, so a hard refresh behaves exactly like navigating here.
  const { data, loading, error, reload } = useApi(() => api.workout(id), [id]);

  if (loading && !data) return <Spinner full label="Loading workout…" />;

  if (error) {
    return (
      <div className="page">
        <p>
          <Link to="/history">‹ History</Link>
        </p>
        {error.status === 404 ? (
          <EmptyState title="Workout not found">
            This workout doesn’t exist, or it isn’t yours.
          </EmptyState>
        ) : (
          <ErrorMessage error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  // routine_id is null for a freestyle workout.
  const isFreestyle = data.routine_id == null;

  return (
    <div className="page">
      <p>
        <Link to="/history">‹ History</Link>
      </p>

      <header className="wd-head">
        <h1>{data.routine_name || 'Freestyle workout'}</h1>
        <p className="wd-meta">
          {isFreestyle ? 'Freestyle' : 'Routine'} · {formatDate(data.date)}
        </p>
      </header>

      <section aria-labelledby="wd-sets-heading">
        <h2 id="wd-sets-heading">Sets</h2>
        {data.sets.length === 0 ? (
          <EmptyState title="No sets logged">
            This workout was started but no sets were recorded.
            <div>
              <Button onClick={() => navigate('/workout')}>
                Start a new workout
              </Button>
            </div>
          </EmptyState>
        ) : (
          // SetList derives the grouped-by-exercise view from the flat sets
          // array on every render — it is never stored as state. Same component
          // the active workout screen uses; the API's set shape is identical.
          <SetList sets={data.sets} />
        )}
      </section>
    </div>
  );
}
