import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { groupExercises } from './exerciseGroups';
import './ExerciseSelect.css';

// Pick an exercise from the library, with photos.
//
// A native <select> can't show pictures, so this is our own picker: a field
// that looks like the other dropdowns (photo + name of the current pick), and
// tapping it opens a full-screen list grouped by muscle, with a search box and
// a small start/finish photo next to every exercise.
//
// The pop-up is a native <dialog>, like ImageViewer: showModal() gives the
// backdrop, keeps keyboard focus inside and closes on Escape. It also adds one
// history entry while open, so the phone's Back button closes the list
// instead of leaving the workout page.
//
// Shared by the routine builder and workout set logging.
// `exercises` is the GET /api/exercises array. `value` is the selected id as a
// string ("" = nothing). `onChange` gets the new id as a string.
export default function ExerciseSelect({
  exercises,
  value,
  onChange,
  label = 'Exercise',
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const chosen = exercises.find((e) => String(e.id) === String(value));

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="exercise-pick"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {chosen ? (
          <>
            <Thumb exercise={chosen} />
            <span className="exercise-pick-name">{chosen.name}</span>
          </>
        ) : (
          <span className="exercise-pick-placeholder">Select an exercise…</span>
        )}
        <span className="exercise-pick-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ExercisePickerDialog
          exercises={exercises}
          value={value}
          onPick={(pickedId) => onChange(String(pickedId))}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function Thumb({ exercise }) {
  return exercise.image_url ? (
    <img
      className="exercise-pick-thumb"
      src={exercise.image_url}
      alt=""
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="exercise-pick-thumb" aria-hidden="true" />
  );
}

const HISTORY_KEY = 'exercisePicker';

function ExercisePickerDialog({ exercises, value, onPick, onClose }) {
  const ref = useRef(null);
  const searchRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState('');
  const groups = useMemo(
    () => groupExercises(exercises, query),
    [exercises, query],
  );
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();

    // Start with the current pick in view. Only jump to the search box with a
    // mouse: on a phone that would pop up the keyboard over the list.
    dialog?.querySelector('[aria-current="true"]')?.scrollIntoView({
      block: 'center',
    });
    if (window.matchMedia?.('(pointer: fine)').matches) {
      searchRef.current?.focus();
    } else {
      dialog?.querySelector('.exercise-picker-list')?.focus();
    }

    // Same Back-button handling as ImageViewer.
    if (!window.history.state?.[HISTORY_KEY]) {
      window.history.pushState({ [HISTORY_KEY]: true }, '');
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function handleClose() {
    if (window.history.state?.[HISTORY_KEY]) window.history.back();
    else onCloseRef.current();
  }

  function pick(exerciseId) {
    onPick(exerciseId);
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      className="exercise-picker"
      aria-labelledby={titleId}
      onClose={handleClose}
      // A tap on the dark backdrop (outside the sheet) closes it.
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <div className="exercise-picker-sheet">
        <div className="exercise-picker-head">
          <h2 id={titleId}>Choose an exercise</h2>
          <button
            type="button"
            className="exercise-picker-close"
            aria-label="Close"
            onClick={() => ref.current?.close()}
          >
            ×
          </button>
        </div>
        <input
          ref={searchRef}
          type="search"
          className="exercise-picker-search"
          placeholder="Search exercises or muscles"
          aria-label="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // This sits inside the set form: Enter must not submit it.
            // Instead it picks the first match.
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const first = groups[0]?.[1][0];
            if (first) pick(first.id);
          }}
        />
        <div className="exercise-picker-list" tabIndex={-1}>
          {groups.length === 0 && (
            <p className="exercise-picker-empty" role="status">
              No exercises match “{query.trim()}”.
            </p>
          )}
          {groups.map(([muscle, list]) => (
            <section key={muscle} aria-label={muscle}>
              <h3 className="exercise-picker-muscle">{muscle}</h3>
              <ul>
                {list.map((e) => {
                  const selected = String(e.id) === String(value);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="exercise-picker-option"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => pick(e.id)}
                      >
                        <Thumb exercise={e} />
                        <span className="exercise-picker-name">{e.name}</span>
                        {selected && (
                          <span
                            className="exercise-picker-check"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
