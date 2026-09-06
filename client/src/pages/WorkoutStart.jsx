import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import Select from '../components/Select';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import './WorkoutStart.css';

// State machine:
//   idle → (choose routine | choose freestyle) → starting → active workout
//                                              ↘ starting failed → back to choosing
export default function WorkoutStart() {
  const navigate = useNavigate();
  const { data: routines, loading, error } = useApi(() => api.routines(), []);
  const current = useApi(() => api.currentWorkout(), []);

  const [mode, setMode] = useState('routine'); // 'routine' | 'freestyle'
  const [routineId, setRoutineId] = useState(''); // string, from <select>
  const [startErr, setStartErr] = useState(null);
  const [starting, setStarting] = useState(false);
  const inFlight = useRef(false); // synchronous double-submit guard

  const noRoutines = !loading && !error && routines && routines.length === 0;
  // If the user has no routines, freestyle is the only option.
  const effectiveMode = noRoutines ? 'freestyle' : mode;

  async function start() {
    if (inFlight.current) return;

    let routineArg; // undefined => freestyle
    if (effectiveMode === 'routine') {
      const n = Number(routineId);
      if (!Number.isInteger(n) || n <= 0) {
        setStartErr(new ApiError(400, 'Choose a routine, or switch to freestyle.'));
        return;
      }
      routineArg = n;
    }

    inFlight.current = true;
    setStartErr(null);
    setStarting(true);
    try {
      // POST /api/workouts -> 201 { id, routine_id, date }. The server-created
      // id is what we route to; we don't invent one.
      const workout = await api.startWorkout(routineArg);
      navigate(`/workout/${workout.id}`);
    } catch (err) {
      setStartErr(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setStarting(false);
    }
  }

  return (
    <div className="page">
      <h1>Start a workout</h1>

      {current.data && (
        <Card className="ws-resume">
          <p className="ws-hint">
            You have an unfinished workout from {formatDate(current.data.date)}.
          </p>
          <Button
            className="btn-block"
            onClick={() => navigate(`/workout/${current.data.id}`)}
          >
            Resume it
          </Button>
        </Card>
      )}

      {current.data && <h2>Or start a new one</h2>}

      {loading && <Spinner label="Loading your routines…" />}
      {error && <ErrorMessage error={error} />}

      {!loading && !error && (
        <Card className="workout-start">
          {noRoutines ? (
            <p className="ws-hint">
              You have no routines yet.{' '}
              <Link to="/routines">Create one</Link> to follow a plan, or start a
              freestyle workout now.
            </p>
          ) : (
            <fieldset className="ws-modes">
              <legend>How do you want to train?</legend>
              <label className="ws-mode">
                <input
                  type="radio"
                  name="mode"
                  checked={effectiveMode === 'routine'}
                  onChange={() => setMode('routine')}
                />
                <span>Follow a routine</span>
              </label>
              <label className="ws-mode">
                <input
                  type="radio"
                  name="mode"
                  checked={effectiveMode === 'freestyle'}
                  onChange={() => setMode('freestyle')}
                />
                <span>Freestyle — pick exercises as you go</span>
              </label>
            </fieldset>
          )}

          {effectiveMode === 'routine' && !noRoutines && (
            <Select
              label="Routine"
              value={routineId}
              onChange={(e) => setRoutineId(e.target.value)}
            >
              <option value="">Select a routine…</option>
              {(routines || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}

          {startErr && <ErrorMessage error={startErr} />}

          <Button
            onClick={start}
            pending={starting}
            pendingLabel="Starting…"
            className="btn-block"
          >
            {effectiveMode === 'freestyle'
              ? 'Start freestyle workout'
              : 'Start workout'}
          </Button>
        </Card>
      )}
    </div>
  );
}
