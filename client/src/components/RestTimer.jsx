import { useEffect, useRef, useState } from 'react';
import './RestTimer.css';

// A between-sets countdown. Frontend-only — nothing is stored.
//
// `runId` restarts the timer whenever it changes (the parent bumps it after
// every logged set). The chosen duration is remembered in localStorage so it
// survives a refresh; it is a per-device convenience, not server state.

const KEY = 'gt.restSeconds';
const DEFAULT = 120;
const STEP = 15;
const MIN = 15;
const MAX = 600;

function loadDuration() {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function mmss(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer({ runId }) {
  const [duration, setDuration] = useState(loadDuration);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);

  // Start / restart whenever runId changes (a set was just logged). runId 0 is
  // the initial mount — don't auto-start then.
  useEffect(() => {
    if (!runId) return;
    endRef.current = Date.now() + duration * 1000;
    setRemaining(duration);
    setRunning(true);
    // duration intentionally omitted: changing the duration shouldn't restart a
    // running timer, only the next set should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Tick. Compute from an absolute end time so a backgrounded tab stays accurate.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        if (navigator.vibrate) navigator.vibrate(200);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  function changeDuration(next) {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setDuration(clamped);
    try {
      localStorage.setItem(KEY, String(clamped));
    } catch {
      /* private mode — fine, just won't persist */
    }
  }

  const done = running === false && remaining === 0 && runId > 0;

  return (
    <div
      className={`rest-timer${running ? ' rest-timer-running' : ''}${
        done ? ' rest-timer-done' : ''
      }`}
    >
      <div className="rest-timer-main">
        <span className="rest-timer-label">Rest</span>
        <span className="rest-timer-clock" aria-live="polite">
          {running ? mmss(remaining) : done ? 'done' : mmss(duration)}
        </span>
      </div>

      <div className="rest-timer-controls">
        <button
          type="button"
          onClick={() => changeDuration(duration - STEP)}
          aria-label={`Decrease rest by ${STEP} seconds`}
        >
          −{STEP}s
        </button>
        <button
          type="button"
          onClick={() => changeDuration(duration + STEP)}
          aria-label={`Increase rest by ${STEP} seconds`}
        >
          +{STEP}s
        </button>
        {running && (
          <button
            type="button"
            className="rest-timer-skip"
            onClick={() => {
              setRunning(false);
              setRemaining(duration);
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
