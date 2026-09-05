import { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from '../router';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import SetForm from './SetForm';
import SetList from './SetList';
import './WorkoutSession.css';

// The backend stores dates as "YYYY-MM-DD HH:MM:SS" in UTC.
function formatStarted(raw) {
  const d = new Date(raw.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
}

export default function WorkoutSession({ id }) {
  const navigate = useNavigate();

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

  return (
    <div className="page">
      <header className="ws-head">
        <h1>{w.routine_name || 'Freestyle workout'}</h1>
        <p className="ws-started">Started {formatStarted(w.date)}</p>
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
          onExerciseChange={setExerciseId}
          onLogged={workout.reload}
        />
      )}

      <section aria-labelledby="logged-heading" className="ws-logged">
        <h2 id="logged-heading">Logged sets</h2>
        {sets.length === 0 ? (
          <EmptyState title="No sets yet">
            Pick an exercise above and log your first set.
          </EmptyState>
        ) : (
          <SetList sets={sets} />
        )}
      </section>

      <Button
        variant="secondary"
        className="btn-block"
        onClick={() => navigate('/')}
      >
        Finish workout
      </Button>
    </div>
  );
}
