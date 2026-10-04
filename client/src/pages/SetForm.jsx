import { useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import {
  formatWeight,
  fromKg,
  toKg,
  formatDate,
  setTypeLabel,
} from '../format';
import { checkSetSanity, RPE_OPTIONS } from '../coach';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import ExerciseSelect from '../components/ExerciseSelect';
import ErrorMessage from '../components/ErrorMessage';
import './SetForm.css';

// reps: whole number > 0 (backend positiveInt). null = invalid.
function validReps(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
// weight: number >= 0 in the user's unit, decimals allowed. null = invalid.
function validWeight(v) {
  if (String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const SET_TYPES = [
  ['normal', 'Normal'],
  ['warmup', 'Warm-up'],
  ['dropset', 'Drop set'],
  ['failure', 'To failure'],
];

// `exerciseId` / `onExerciseChange` are lifted to the parent so the routine
// quick-pick chips and this dropdown stay in sync. reps / weight / set type are
// local — they only matter to this form.
export default function SetForm({
  workoutId,
  exercises,
  sets,
  exerciseId,
  unit = 'kg',
  onExerciseChange,
  onLogged,
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [setType, setSetType] = useState('normal');
  const [rpe, setRpe] = useState(''); // '' = not recorded
  const [warning, setWarning] = useState(null); // "did you mean…?" text
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const id = Number(exerciseId);

  // Server state: what this user did for this exercise last time. Re-fetched
  // when the exercise changes; the current workout is excluded.
  const previous = useApi(
    () => (id ? api.lastSets(id, workoutId) : Promise.resolve(null)),
    [id, workoutId],
  );

  // DERIVED, not state: the next set number for the chosen exercise in THIS
  // workout = how many sets already logged for it + 1. Recomputed each render,
  // so it advances automatically after every logged set (once `sets` refreshes)
  // and resets when you switch exercise.
  const nextSetNumber = useMemo(() => {
    if (!id) return 1;
    return sets.filter((s) => s.exercise_id === id).length + 1;
  }, [sets, id]);

  const chosen = exercises.find((e) => e.id === id);

  // Server state: a double-progression suggestion for THIS set, built from last
  // session. Purely advisory — a failed lookup just hides the chip.
  const suggestion = useApi(
    () =>
      id
        ? api.exerciseSuggestion(id, nextSetNumber, workoutId)
        : Promise.resolve(null),
    [id, nextSetNumber, workoutId],
  );

  function applySuggestion() {
    const s = suggestion.data;
    if (!s) return;
    setReps(String(s.reps));
    setWeight(String(fromKg(s.weight_kg, unit)));
    setSetType('normal');
    setWarning(null);
  }

  function onSubmit(e) {
    e.preventDefault();
    submit(false);
  }

  // `force` skips the typo check — the user answered "log anyway".
  async function submit(force) {
    if (inFlight.current) return; // synchronous guard — see ARCHITECTURE.md

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
      setError(
        new ApiError(
          400,
          `Weight must be 0 or more (${unit}; decimals like 42.5 are fine).`,
        ),
      );
      return;
    }

    if (!force) {
      const doubt = checkSetSanity({
        reps: r,
        weightKg: toKg(wt, unit),
        previousSets: previous.data?.sets ?? [],
        unit,
        setType,
      });
      if (doubt) {
        setWarning(doubt);
        return;
      }
    }

    inFlight.current = true;
    setWarning(null);
    setError(null);
    setSubmitting(true);
    try {
      // POST /api/workouts/:id/sets — the server confirms the set exists.
      // Weight is always sent in kilograms; convert from the user's unit here.
      await api.logSet(workoutId, {
        exercise_id: id,
        set_number: nextSetNumber,
        reps: r,
        weight: toKg(wt, unit),
        set_type: setType,
        ...(rpe === '' ? {} : { rpe: Number(rpe) }),
      });
      setRpe(''); // effort is per set — start the next one blank
      // Keep exercise + reps + weight + type so the next set is one tap.
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

      {chosen && previous.data && (
        <p className="set-form-previous">
          <span className="set-form-previous-label">
            Last time ({formatDate(previous.data.date)}):
          </span>{' '}
          {previous.data.sets
            .map(
              (s) =>
                `${s.reps} × ${formatWeight(s.weight, unit)}` +
                (setTypeLabel(s.set_type)
                  ? ` (${setTypeLabel(s.set_type)})`
                  : ''),
            )
            .join(' · ')}
        </p>
      )}

      {chosen && suggestion.data && (
        <button
          type="button"
          className="set-form-suggest"
          onClick={applySuggestion}
        >
          <span className="set-form-suggest-label">Suggested</span>
          <span className="set-form-suggest-value">
            {suggestion.data.reps} ×{' '}
            {formatWeight(suggestion.data.weight_kg, unit)}
          </span>
          <span className="set-form-suggest-why">{suggestion.data.reason}</span>
          <span className="set-form-suggest-use">Tap to use</span>
        </button>
      )}

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
          onChange={(e) => {
            setReps(e.target.value);
            setWarning(null);
          }}
        />
        <Input
          label={`Weight (${unit})`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            setWarning(null);
          }}
        />
      </div>

      <Select
        label="Set type"
        value={setType}
        onChange={(e) => setSetType(e.target.value)}
      >
        {SET_TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>

      <Select
        label="Effort (RPE, optional)"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
      >
        <option value="">Not recorded</option>
        {RPE_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v}
            {v === 10 ? ' — max effort' : ''}
          </option>
        ))}
      </Select>

      {warning && (
        <div className="set-form-warning" role="alert">
          <p>{warning}</p>
          <div className="set-form-warning-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWarning(null)}
            >
              Change it
            </Button>
            <Button type="button" onClick={() => submit(true)}>
              Log anyway
            </Button>
          </div>
        </div>
      )}

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
