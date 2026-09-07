import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './History.css';

const PAGE = 20;

// History is paginated: the first page loads on mount, "Load more" appends the
// next. `useApi` fits a single fetch, not an accumulating list, so this screen
// manages its own state. A full page (=== PAGE rows) means there may be more.
export default function History() {
  const navigate = useNavigate();

  const [workouts, setWorkouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const loadFirst = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .workouts({ limit: PAGE, offset: 0 })
      .then((rows) => {
        if (cancelled) return;
        setWorkouts(rows);
        setHasMore(rows.length === PAGE);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err : new ApiError(0));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(loadFirst, [loadFirst]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const rows = await api.workouts({ limit: PAGE, offset: workouts.length });
      setWorkouts((cur) => [...cur, ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="page">
      <h1>History</h1>

      {loading && <Spinner label="Loading your workouts…" />}

      {!loading && error && <ErrorMessage error={error} onRetry={loadFirst} />}

      {/* Zero workouts is valid data, not an error. */}
      {!loading && !error && workouts && workouts.length === 0 && (
        <EmptyState title="No workouts yet">
          Your logged workouts will show up here.
          <div>
            <Button onClick={() => navigate('/workout')}>Start a workout</Button>
          </div>
        </EmptyState>
      )}

      {!loading && workouts && workouts.length > 0 && (
        <>
          {/* Rendered in the exact order the server returned (date DESC, id DESC).
              No client-side sort — the API owns the ordering. */}
          <ul className="history-list">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link to={`/history/${w.id}`} className="history-row">
                  <span className="history-top">
                    <span className="history-name">
                      {w.routine_name || 'Freestyle'}
                      {w.completed_at == null && (
                        <span className="history-badge">In progress</span>
                      )}
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

          {error && <ErrorMessage error={error} />}

          {hasMore && (
            <Button
              variant="secondary"
              className="btn-block"
              onClick={loadMore}
              pending={loadingMore}
              pendingLabel="Loading…"
            >
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
