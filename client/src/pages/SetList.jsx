import { useState } from 'react';
import { ApiError } from '../api';
import { formatWeight, fromKg, toKg, setTypeLabel } from '../format';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import './SetList.css';

// Group the flat set list (server order = log order, oldest first) by exercise,
// keeping each exercise in the order it first appeared in the workout.
// The underlying rows are unchanged server records — this is display only.
function groupByExercise(sets) {
  const order = [];
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.exercise_id)) {
      map.set(s.exercise_id, {
        exercise_id: s.exercise_id,
        name: s.exercise_name,
        muscle_group: s.muscle_group,
        rows: [],
      });
      order.push(s.exercise_id);
    }
    map.get(s.exercise_id).rows.push(s);
  }
  return order.map((id) => map.get(id));
}

const SET_TYPES = [
  ['normal', 'Normal'],
  ['warmup', 'Warm-up'],
  ['dropset', 'Drop set'],
  ['failure', 'To failure'],
];

// One set. Read-only unless onEdit / onDelete are supplied, in which case it
// grows an inline edit form and a two-tap delete. Each row owns its own edit /
// confirm / busy state — a mistake on one row never touches the others.
function SetRow({ set: s, unit, onEdit, onDelete }) {
  const editable = Boolean(onEdit && onDelete);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'confirm-delete'
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [setType, setSetType] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setReps(String(s.reps));
    setWeight(String(fromKg(s.weight, unit)));
    setSetType(s.set_type || 'normal');
    setError(null);
    setMode('edit');
  }

  async function save() {
    const r = Number(reps);
    const w = Number(weight);
    if (!Number.isInteger(r) || r <= 0) {
      setError(new ApiError(400, 'Reps must be a whole number above 0.'));
      return;
    }
    if (!Number.isFinite(w) || w < 0) {
      setError(new ApiError(400, `Weight must be 0 or more (${unit}).`));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onEdit(s.id, { reps: r, weight: toKg(w, unit), set_type: setType });
      setMode('view');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await onDelete(s.id);
      // the row disappears on the parent's re-fetch
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
      setBusy(false);
      setMode('view');
    }
  }

  if (mode === 'edit') {
    return (
      <li className="set-row set-row-editing">
        <div className="set-edit-fields">
          <Input
            label="Reps"
            type="number"
            inputMode="numeric"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
          <Input
            label={`Weight (${unit})`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
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
        {error && <ErrorMessage error={error} />}
        <div className="set-row-actions">
          <Button variant="secondary" onClick={() => setMode('view')} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} pending={busy} pendingLabel="Saving…">
            Save
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="set-row">
      <span className="set-row-n">
        Set {s.set_number}
        {setTypeLabel(s.set_type) && (
          <span className="set-row-type"> · {setTypeLabel(s.set_type)}</span>
        )}
      </span>
      <span className="set-row-detail">
        {s.reps} reps × {formatWeight(s.weight, unit)}
      </span>

      {editable && mode === 'view' && (
        <span className="set-row-actions">
          <button type="button" className="set-row-btn" onClick={startEdit}>
            Edit
          </button>
          <button
            type="button"
            className="set-row-btn set-row-btn-danger"
            onClick={() => setMode('confirm-delete')}
          >
            Delete
          </button>
        </span>
      )}

      {editable && mode === 'confirm-delete' && (
        <span className="set-row-actions">
          <span className="set-row-confirm">Delete this set?</span>
          <button
            type="button"
            className="set-row-btn"
            onClick={() => setMode('view')}
            disabled={busy}
          >
            No
          </button>
          <button
            type="button"
            className="set-row-btn set-row-btn-danger"
            onClick={remove}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Yes'}
          </button>
        </span>
      )}

      {error && mode !== 'edit' && (
        <span className="set-row-actions">
          <ErrorMessage error={error} />
        </span>
      )}
    </li>
  );
}

export default function SetList({ sets, unit = 'kg', onEditSet, onDeleteSet }) {
  const groups = groupByExercise(sets);

  return (
    <ul className="set-groups">
      {groups.map((g) => (
        <li key={g.exercise_id} className="set-group">
          <div className="set-group-head">
            {/* h3: the page owns h1, the "Sets"/"Logged sets" section owns h2,
                so each exercise is an h3 — screen readers can jump between
                exercises via heading navigation. */}
            <h3 className="set-group-name">{g.name}</h3>
            {g.muscle_group && (
              <span className="set-group-muscle">{g.muscle_group}</span>
            )}
          </div>
          <ol className="set-rows">
            {g.rows.map((s) => (
              <SetRow
                key={s.id}
                set={s}
                unit={unit}
                onEdit={onEditSet}
                onDelete={onDeleteSet}
              />
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}
