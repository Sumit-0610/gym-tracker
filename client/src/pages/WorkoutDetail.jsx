import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import { formatDate, formatVolume } from '../format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import SetList from './SetList';
import './WorkoutDetail.css';

// `id` is the route param from "/history/:id" — always a string.
export default function WorkoutDetail({ id }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unit = user?.weight_unit || 'kg';

  // Everything on this page is rebuilt from this one GET. Nothing depends on
  // earlier React state, so a hard refresh behaves exactly like navigating here.
  const { data, loading, error, reload } = useApi(() => api.workout(id), [id]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionErr, setActionErr] = useState(null);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inFlight = useRef(false);

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
  const finished = data.completed_at != null;
  const volumeKg = data.sets.reduce((t, s) => t + s.reps * s.weight, 0);

  const editSet = (setId, patch) =>
    api.editSet(id, setId, patch).then(() => reload());
  const deleteSet = (setId) =>
    api.deleteSet(id, setId).then(() => reload());

  async function reopen() {
    if (inFlight.current) return;
    inFlight.current = true;
    setActionErr(null);
    setReopening(true);
    try {
      await api.reopenWorkout(id);
      reload();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setReopening(false);
    }
  }

  async function removeWorkout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setActionErr(null);
    setDeleting(true);
    try {
      await api.deleteWorkout(id);
      navigate('/history');
    } catch (err) {
      setActionErr(err instanceof ApiError ? err : new ApiError(0));
      inFlight.current = false;
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="page">
      <p>
        <Link to="/history">‹ History</Link>
      </p>

      <header className="wd-head">
        <h1>{data.routine_name || 'Freestyle workout'}</h1>
        <p className="wd-meta">
          {isFreestyle ? 'Freestyle' : 'Routine'} · {formatDate(data.date)}
          {volumeKg > 0 && <> · {formatVolume(volumeKg, unit)} lifted</>}
          {' · '}
          {finished ? (
            <span className="wd-status wd-status-done">
              Finished {formatDate(data.completed_at)}
            </span>
          ) : (
            <span className="wd-status wd-status-open">In progress</span>
          )}
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
          <SetList
            sets={data.sets}
            unit={unit}
            onEditSet={editSet}
            onDeleteSet={deleteSet}
          />
        )}
      </section>

      {actionErr && <ErrorMessage error={actionErr} />}

      <div className="wd-actions">
        {!finished && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/workout/${data.id}`)}
          >
            Resume workout
          </Button>
        )}
        {finished && (
          <Button
            variant="secondary"
            onClick={reopen}
            pending={reopening}
            pendingLabel="Reopening…"
          >
            Reopen
          </Button>
        )}

        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete workout
          </Button>
        ) : (
          <span className="wd-confirm">
            <span>Delete this workout and its sets?</span>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={removeWorkout}
              pending={deleting}
              pendingLabel="Deleting…"
            >
              Delete
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
