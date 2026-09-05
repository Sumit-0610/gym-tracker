import { useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ExerciseSelect from '../components/ExerciseSelect';
import ErrorMessage from '../components/ErrorMessage';
import './SetForm.css';

// reps: whole number > 0 (backend positiveInt). null = invalid.
function validReps(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
// weight: number >= 0, decimals allowed (backend nonNegativeNumber, REAL column).
function validWeight(v) {
  if (String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// `exerciseId` / `onExerciseChange` are lifted to the parent so the routine
// quick-pick chips and this dropdown stay in sync. reps/weight are purely
// local — they only matter to this form.
export default function SetForm({
  workoutId,
  exercises,
  sets,
  exerciseId,
  onExerciseChange,
  onLogged,
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  // DERIVED, not state: the next set number for the chosen exercise in THIS
  // workout = how many sets already logged for it + 1. Recomputed each render,
  // so it advances automatically after every logged set (once `sets` refreshes)
  // and resets when you switch exercise.
  const nextSetNumber = useMemo(() => {
    const id = Number(exerciseId);
    if (!id) return 1;
    return sets.filter((s) => s.exercise_id === id).length + 1;
  }, [sets, exerciseId]);

  const chosen = exercises.find((e) => e.id === Number(exerciseId));

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return; // synchronous guard — see ARCHITECTURE.md

    const id = Number(exerciseId);
    if (!Number.isInteger(id) || id <= 0) {
      setError(new ApiError(400, 'Choose an exercise.'));
      return;
    }
    const r = validReps(reps);
    if (r === null) {
      setError(new ApiError(400, 'Reps must be a whole number above 0.'));
      return;
    }
    const wt = validWeight(weight);
    if (wt === null) {
      setError(new ApiError(400, 'Weight must be 0 or more (decimals like 42.5 are fine).'));
      return;
    }

    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      // POST /api/workouts/:id/sets — the server confirms the set exists.
      await api.logSet(workoutId, {
        exercise_id: id,
        set_number: nextSetNumber,
        reps: r,
        weight: wt,
      });
      // Keep exercise + reps + weight so the next set of "3×10 @ 40" is one tap.
      // The set number advances on its own once the parent re-fetches `sets`.
      onLogged();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Card as="form" onSubmit={onSubmit} noValidate className="set-form">
      <h2>Log a set</h2>

      <ExerciseSelect
        exercises={exercises}
        value={exerciseId}
        onChange={(e) => onExerciseChange(e.target.value)}
      />

      {chosen && (
        <p className="set-form-context">
          Logging <strong>set {nextSetNumber}</strong> of {chosen.name}
        </p>
      )}

      <div className="set-form-row">
        <Input
          label="Reps"
          type="number"
          inputMode="numeric"
          min="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <Input
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>

      {error && <ErrorMessage error={error} />}

      <Button
        type="submit"
        pending={submitting}
        pendingLabel="Logging…"
        className="btn-block"
      >
        Log set
      </Button>
    </Card>
  );
}
