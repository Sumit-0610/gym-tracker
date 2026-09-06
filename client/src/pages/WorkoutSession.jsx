import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import RestTimer from '../components/RestTimer';
import SetForm from './SetForm';
import SetList from './SetList';
import './WorkoutSession.css';

export default function WorkoutSession({ id }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unit = user?.weight_unit || 'kg';

  // Server state: the workout + every set logged so far (with exercise names).
  // GET /api/workouts/:id — the same endpoint history uses. Because the id is
  // in the URL, a refresh reloads this cleanly.
  const workout = useApi(() => api.workout(id), [id]);

  // Server state: the full exercise library, for the set-logging selector.
  const library = useApi(() => api.exercises(), []);

  // Server state (routine workouts only): the routine's planned exercises,
  // shown as quick-pick chips. `null` for a freestyle workout.
  const routineId = workout.data?.routine_id ?? null;
  const routine = useApi(
    () => (routineId ? api.routine(routineId) : Promise.resolve(null)),
    [routineId]
  );

  // UI state: which exercise the set form is aimed at. Lifted here so the
  // chips and the dropdown control the same value.
  const [exerciseId, setExerciseId] = useState('');

  // UI state: bumped after every logged set to (re)start the rest timer.
  const [restRun, setRestRun] = useState(0);

  // Finishing the workout.
  const [finishing, setFinishing] = useState(false);
  const [finishErr, setFinishErr] = useState(null);
  const finishInFlight = useRef(false);

  // Initial load — keep the big spinner only until we first have data.
  if (workout.loading && !workout.data) {
    return <Spinner full label="Loading workout…" />;
  }

  if (workout.error) {
    return (
      <div className="page">
        {workout.error.status === 404 ? (
          <EmptyState title="Workout not found">
            This workout doesn’t exist, or it isn’t yours.
            <div>
              <Link to="/workout">Start a new workout</Link>
            </div>
          </EmptyState>
        ) : (
          <ErrorMessage error={workout.error} onRetry={workout.reload} />
        )}
      </div>
    );
  }

  const w = workout.data;
  const sets = w.sets;
  const finished = w.completed_at != null;

  function onSetLogged() {
    workout.reload();
    setRestRun((n) => n + 1);
  }

  async function finish() {
    if (finishInFlight.current) return;
    finishInFlight.current = true;
    setFinishErr(null);
    setFinishing(true);
    try {
      await api.finishWorkout(id);
      navigate(`/history/${id}`);
    } catch (err) {
      setFinishErr(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      finishInFlight.current = false;
      setFinishing(false);
    }
  }

  return (
    <div className="page">
      <header className="ws-head">
        <h1>{w.routine_name || 'Freestyle workout'}</h1>
        <p className="ws-started">
          Started {formatDate(w.date)}
          {finished && (
            <>
              {' · '}
              <span className="ws-finished">Finished {formatDate(w.completed_at)}</span>
            </>
          )}
        </p>
      </header>

      {routineId && routine.data && routine.data.exercises.length > 0 && (
        <Card className="ws-plan">
          <h2>Today’s plan</h2>
          <div className="ws-chips">
            {routine.data.exercises.map((e, i) => (
              <button
                key={`${e.id}-${i}`}
                type="button"
                className={
                  Number(exerciseId) === e.id ? 'ws-chip ws-chip-active' : 'ws-chip'
                }
                onClick={() => setExerciseId(String(e.id))}
              >
                {e.name}
                {e.target_sets != null && e.target_reps != null && (
                  <span className="ws-chip-target">
                    {' '}
                    {e.target_sets}×{e.target_reps}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {library.loading && <Spinner label="Loading exercises…" />}
      {library.error && (
        <ErrorMessage error={library.error} onRetry={library.reload} />
      )}
      {library.data && (
        <SetForm
          workoutId={id}
          exercises={library.data}
          sets={sets}
          exerciseId={exerciseId}
          unit={unit}
          onExerciseChange={setExerciseId}
          onLogged={onSetLogged}
        />
      )}

      <RestTimer runId={restRun} />

      <section aria-labelledby="logged-heading" className="ws-logged">
        <h2 id="logged-heading">Logged sets</h2>
        {sets.length === 0 ? (
          <EmptyState title="No sets yet">
            Pick an exercise above and log your first set.
          </EmptyState>
        ) : (
          <SetList sets={sets} unit={unit} />
        )}
      </section>

      {finishErr && <ErrorMessage error={finishErr} />}

      {finished ? (
        <Button
          variant="secondary"
          className="btn-block"
          onClick={() => navigate(`/history/${id}`)}
        >
          View in history
        </Button>
      ) : (
        <Button
          className="btn-block"
          onClick={finish}
          pending={finishing}
          pendingLabel="Finishing…"
        >
          Finish workout
        </Button>
      )}
    </div>
  );
}
