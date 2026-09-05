import { useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { Link } from '../router';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './RoutineDetail.css';

// Parse an optional "target" field. Empty string -> not sent. Otherwise it must
// be a whole number > 0 (the backend's positiveInt rule).
function parseTarget(raw, label) {
  if (raw.trim() === '') return { value: undefined };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { error: `${label} must be a whole number above 0.` };
  }
  return { value: n };
}

function AddExerciseForm({ routineId, exercises, onAdded }) {
  const [exerciseId, setExerciseId] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false); // see the note in Routines.jsx

  // Group the library by muscle so the <select> can use <optgroup>.
  const groups = useMemo(() => {
    const byMuscle = new Map();
    for (const e of exercises) {
      const key = e.muscle_group || 'Other';
      if (!byMuscle.has(key)) byMuscle.set(key, []);
      byMuscle.get(key).push(e);
    }
    return [...byMuscle.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises]);

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;

    const id = Number(exerciseId);
    if (!Number.isInteger(id) || id <= 0) {
      setError(new ApiError(400, 'Choose an exercise.'));
      return;
    }
    const s = parseTarget(sets, 'Target sets');
    const r = parseTarget(reps, 'Target reps');
    if (s.error || r.error) {
      setError(new ApiError(400, s.error || r.error));
      return;
    }

    inFlight.current = true;
    setError(null);
    setPending(true);
    try {
      const payload = { exercise_id: id };
      if (s.value !== undefined) payload.target_sets = s.value;
      if (r.value !== undefined) payload.target_reps = r.value;
      await api.addRoutineExercise(routineId, payload);
      // Reset the form and let the parent re-fetch the routine.
      setExerciseId('');
      setSets('');
      setReps('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Card as="form" onSubmit={onSubmit} noValidate className="add-exercise">
      <h2>Add an exercise</h2>
      <Select
        label="Exercise"
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
      >
        <option value="">Select an exercise…</option>
        {groups.map(([muscle, list]) => (
          <optgroup key={muscle} label={muscle}>
            {list.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      <div className="target-row">
        <Input
          label="Target sets"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="optional"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
        />
        <Input
          label="Target reps"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="optional"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
      </div>

      {error && <ErrorMessage error={error} />}
      <Button type="submit" pending={pending}>
        Add to routine
      </Button>
    </Card>
  );
}

// `id` is the route parameter from "/routines/:id" — always a string here.
export default function RoutineDetail({ id }) {
  const routine = useApi(() => api.routine(id), [id]);
  const library = useApi(() => api.exercises(), []);

  return (
    <div className="page">
      <p>
        <Link to="/routines">‹ All routines</Link>
      </p>

      {routine.loading && <Spinner label="Loading routine…" />}

      {!routine.loading &&
        routine.error &&
        (routine.error.status === 404 ? (
          <EmptyState title="Routine not found">
            This routine doesn’t exist, or it isn’t yours.
          </EmptyState>
        ) : (
          <ErrorMessage error={routine.error} onRetry={routine.reload} />
        ))}

      {!routine.loading && !routine.error && routine.data && (
        <>
          <h1>{routine.data.name}</h1>

          {routine.data.exercises.length === 0 ? (
            <EmptyState title="No exercises in this routine">
              Add one using the form below.
            </EmptyState>
          ) : (
            <ul className="routine-exercise-list">
              {/* Duplicates are allowed, so exercise id alone isn't a unique
                  key — pair it with the index. Safe because this list only ever
                  grows (no reorder/remove in v1). */}
              {routine.data.exercises.map((ex, i) => (
                <li key={`${ex.id}-${i}`} className="routine-exercise-row">
                  <span className="re-name">{ex.name}</span>
                  {ex.muscle_group && (
                    <span className="re-muscle">{ex.muscle_group}</span>
                  )}
                  {(ex.target_sets != null || ex.target_reps != null) && (
                    <span className="re-target">
                      {ex.target_sets ?? '–'} sets × {ex.target_reps ?? '–'} reps
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {library.loading && <Spinner label="Loading exercise list…" />}
          {library.error && (
            <ErrorMessage error={library.error} onRetry={library.reload} />
          )}
          {library.data && library.data.length > 0 && (
            <AddExerciseForm
              routineId={id}
              exercises={library.data}
              onAdded={routine.reload}
            />
          )}
        </>
      )}
    </div>
  );
}
