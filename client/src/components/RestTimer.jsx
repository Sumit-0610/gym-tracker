import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../format';
import './RestTimer.css';

// A between-sets countdown. Frontend-only — nothing is stored.
//
// `runId` restarts the timer whenever it changes (the parent bumps it after
// every logged set). `defaultSeconds` is the user's saved rest length (from
// their preferences); the −15 / +15 buttons adjust the *running* countdown, or
// — when idle — a session-local length for the next rest. Changing the saved
// default lives in Settings, not here.

const STEP = 15;
const MIN = 15;
const MAX = 600;
const clamp = (n) => Math.min(MAX, Math.max(MIN, n));

export default function RestTimer({ runId, defaultSeconds = 120 }) {
  // The length the *next* rest will use. Starts from the saved default and
  // follows it if the user changes it in Settings mid-workout.
  const [nextLength, setNextLength] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);

  useEffect(() => setNextLength(defaultSeconds), [defaultSeconds]);

  // Start / restart whenever runId changes (a set was just logged). runId 0 is
  // the initial mount — don't auto-start then.
  useEffect(() => {
    if (!runId) return;
    endRef.current = Date.now() + nextLength * 1000;
    setRemaining(nextLength);
    setRunning(true);
    // nextLength intentionally omitted — a mid-rest change to the default
    // shouldn't restart the current countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Tick from an absolute end time so a backgrounded tab stays accurate.
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

  function adjust(delta) {
    if (running) {
      // Move the finish line on the running countdown. Read the live remaining
      // from endRef (always current) rather than the `remaining` state, which
      // only updates every 250 ms — so two quick taps both count.
      const liveLeft = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      const next = clamp(liveLeft + delta);
      endRef.current = Date.now() + next * 1000;
      setRemaining(next);
    } else {
      // no rest running — change the length the next one will use
      setNextLength((s) => clamp(s + delta));
    }
  }

  const done = !running && remaining === 0 && runId > 0;

  return (
    <div
      className={`rest-timer${running ? ' rest-timer-running' : ''}${
        done ? ' rest-timer-done' : ''
      }`}
    >
      <div className="rest-timer-main">
        <span className="rest-timer-label">Rest</span>
        <span className="rest-timer-clock" aria-live="polite">
          {running
            ? formatDuration(remaining)
            : done
              ? 'done'
              : formatDuration(nextLength)}
        </span>
      </div>

      <div className="rest-timer-controls">
        <button
          type="button"
          onClick={() => adjust(-STEP)}
          aria-label={`${running ? 'Take' : 'Set'} ${STEP} seconds ${running ? 'off this rest' : 'less'}`}
        >
          −{STEP}s
        </button>
        <button
          type="button"
          onClick={() => adjust(STEP)}
          aria-label={`${running ? 'Add' : 'Set'} ${STEP} seconds ${running ? 'to this rest' : 'more'}`}
        >
          +{STEP}s
        </button>
        {running && (
          <button
            type="button"
            className="rest-timer-skip"
            onClick={() => {
              setRunning(false);
              setRemaining(nextLength); // back to idle, not "done"
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
