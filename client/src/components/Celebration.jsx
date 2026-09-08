import { useEffect, useRef } from 'react';
import './Celebration.css';

// A quick "nice work" overlay shown after a workout is finished. Presentational
// only — the parent decides when to show it and what happens on "Done".
//
// It is a modal dialog: on mount it takes focus, keeps Tab inside (there is one
// button), closes on Escape, and returns focus on unmount.
export default function Celebration({ setCount, volumeLabel, onDone }) {
  const btnRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    btnRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDone();
      } else if (e.key === 'Tab') {
        // only one focusable element — pin focus to it
        e.preventDefault();
        btnRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      restoreRef.current?.focus?.();
    };
  }, [onDone]);

  return (
    <div
      className="celebrate"
      role="dialog"
      aria-modal="true"
      aria-label="Workout complete"
    >
      {/* a handful of falling emoji — pure CSS, decorative */}
      <div className="celebrate-confetti" aria-hidden="true">
        {['🎉', '💪', '🏋️', '🔥', '⭐', '🎊', '✨', '💥'].map((e, i) => (
          <span key={i} style={{ '--i': i }}>
            {e}
          </span>
        ))}
      </div>

      <div className="celebrate-card">
        <div className="celebrate-emoji">🎉</div>
        <h2>Workout complete!</h2>
        <p className="celebrate-stats">
          {setCount} {setCount === 1 ? 'set' : 'sets'}
          {volumeLabel && (
            <>
              {' · '}
              {volumeLabel} lifted
            </>
          )}
        </p>
        <button
          ref={btnRef}
          type="button"
          className="btn btn-primary btn-block"
          onClick={onDone}
        >
          See it in history
        </button>
      </div>
    </div>
  );
}
