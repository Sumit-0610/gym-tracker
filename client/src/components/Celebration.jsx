import './Celebration.css';

// A quick "nice work" overlay shown after a workout is finished. Presentational
// only — the parent decides when to show it and what happens on "Done".
export default function Celebration({ setCount, volumeLabel, onDone }) {
  return (
    <div className="celebrate" role="dialog" aria-modal="true" aria-label="Workout complete">
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
        <button type="button" className="btn btn-primary btn-block" onClick={onDone}>
          See it in history
        </button>
      </div>
    </div>
  );
}
