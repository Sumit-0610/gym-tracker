import { api } from '../api';
import { useApi } from '../hooks/useApi';
import Spinner from './Spinner';
import './RecapCard.css';

// The AI coach's short written recap of a finished workout
// (POST /api/workouts/:id/recap). The server caches it, so showing this card
// again for the same workout does not call the AI provider again.
//
// Never blocks anything: if the recap is turned off, not set up on the server
// or the AI fails, the card shows a quiet note (or nothing) and the rest of
// the screen is unaffected. `onRetry` is offered only where the caller allows
// another focusable element (the finish overlay keeps a single button).
export default function RecapCard({ workoutId, allowRetry = true }) {
  const { data, error, loading, reload } = useApi(
    () => api.workoutRecap(workoutId),
    [workoutId],
  );

  // Turned off / not configured / nothing to recap: say nothing.
  if (error && [403, 409, 503].includes(error.status)) return null;

  return (
    <section className="recap" aria-live="polite" aria-label="Coach's recap">
      <h3 className="recap-title">🤖 Coach&rsquo;s recap</h3>
      {loading && !data && <Spinner label="Your coach is writing a recap…" />}
      {error && (
        <p className="recap-note">
          The coach couldn&rsquo;t write a recap right now.
          {allowRetry && (
            <>
              {' '}
              <button type="button" className="recap-retry" onClick={reload}>
                Try again
              </button>
            </>
          )}
        </p>
      )}
      {data && (
        <>
          <p className="recap-text">{data.text}</p>
          <p className="recap-note">AI-generated from your logged numbers.</p>
        </>
      )}
    </section>
  );
}
