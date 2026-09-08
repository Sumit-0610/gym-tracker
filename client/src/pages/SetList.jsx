import { useState } from 'react';
import { ApiError } from '../api';
import {
  formatWeight,
  formatVolume,
  fromKg,
  toKg,
  setTypeLabel,
} from '../format';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import { groupByExercise } from './setGrouping';
import './SetList.css';

const SET_TYPES = [
  ['normal', 'Normal'],
  ['warmup', 'Warm-up'],
  ['dropset', 'Drop set'],
  ['failure', 'To failure'],
];

const PencilIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="15"
    height="15"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M11.5 1.5a1.7 1.7 0 0 1 2.4 2.4l-.9.9-2.4-2.4.9-.9ZM9.3 3.7l2.4 2.4-6.6 6.6-2.9.6.6-2.9 6.5-6.7Z"
    />
  </svg>
);
const TrashIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="15"
    height="15"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M6 2h4l.5 1H14v2H2V3h3.5L6 2Zm-2.5 4h9l-.7 8.1a1 1 0 0 1-1 .9H5.2a1 1 0 0 1-1-.9L3.5 6Z"
    />
  </svg>
);

// One set. Read-only unless onEdit / onDelete are supplied, in which case it
// grows an inline edit form and a two-step "are you sure?" delete. Each row
// owns its own edit / confirm / busy state.
function SetRow({ set: s, unit, onEdit, onDelete }) {
  const editable = Boolean(onEdit && onDelete);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'confirm'
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [setType, setSetType] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const volumeKg = s.reps * s.weight;

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
      await onDelete(s.id); // the row vanishes on the parent's re-fetch
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
          <Button
            variant="secondary"
            onClick={() => setMode('view')}
            disabled={busy}
          >
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
        {volumeKg > 0 && (
          <span className="set-row-volume">
            {' '}
            · {formatVolume(volumeKg, unit)}
          </span>
        )}
      </span>

      {editable && mode === 'view' && (
        <span className="set-row-actions">
          <button
            type="button"
            className="set-row-icon"
            onClick={startEdit}
            title="Edit"
            aria-label={`Edit set ${s.set_number}`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="set-row-icon set-row-icon-danger"
            onClick={() => setMode('confirm')}
            title="Delete"
            aria-label={`Delete set ${s.set_number}`}
          >
            <TrashIcon />
          </button>
        </span>
      )}

      {editable && mode === 'confirm' && (
        <span className="set-row-actions set-row-confirm">
          <span>Delete this set — are you sure?</span>
          <button
            type="button"
            className="set-row-btn"
            onClick={() => setMode('view')}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="set-row-btn set-row-btn-danger"
            onClick={remove}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </span>
      )}

      {error && mode === 'view' && (
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
      {groups.map((g) => {
        const groupVolumeKg = g.rows.reduce((t, s) => t + s.reps * s.weight, 0);
        return (
          <li key={g.exercise_id} className="set-group">
            <div className="set-group-head">
              {/* h3: the page owns h1, the "Sets" section owns h2, so each
                  exercise is an h3 — screen readers can jump between them. */}
              <h3 className="set-group-name">{g.name}</h3>
              {g.muscle_group && (
                <span className="set-group-muscle">{g.muscle_group}</span>
              )}
              {groupVolumeKg > 0 && (
                <span className="set-group-volume">
                  {formatVolume(groupVolumeKg, unit)}
                </span>
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
        );
      })}
    </ul>
  );
}
