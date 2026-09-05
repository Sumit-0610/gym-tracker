import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { Link } from '../router';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Routines.css';

// Local form state only. `onCreated` is a callback prop the parent passes so the
// parent (which owns the list) can re-fetch after a successful create.
function CreateRoutineForm({ onCreated }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  // A synchronous "is a request already running?" flag. useRef (not useState)
  // because flipping it must take effect immediately, not after a re-render —
  // that's what stops a second submit fired before React re-renders the
  // disabled button.
  const inFlight = useRef(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;

    const trimmed = name.trim();
    if (!trimmed) {
      // Client-side check = instant feedback. The backend also rejects blank
      // names; this just saves a round trip.
      setError(new ApiError(400, 'Enter a routine name.'));
      return;
    }

    inFlight.current = true;
    setError(null);
    setPending(true); // disables the button
    try {
      await api.createRoutine(trimmed);
      setName('');
      onCreated(); // parent re-fetches -> new routine shows up
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Card as="form" onSubmit={onSubmit} noValidate className="create-routine">
      <Input
        label="New routine"
        placeholder="e.g. Push Day"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error?.status === 400 ? error.message : undefined}
      />
      {/* 400 shows inline on the field; anything else (network, 500) as a box */}
      {error && error.status !== 400 && <ErrorMessage error={error} />}
      <Button type="submit" pending={pending}>
        Create routine
      </Button>
    </Card>
  );
}

export default function Routines() {
  const { data: routines, error, loading, reload } = useApi(
    () => api.routines(),
    []
  );

  return (
    <div className="page">
      <h1>Routines</h1>

      <CreateRoutineForm onCreated={reload} />

      {loading && <Spinner label="Loading routines…" />}
      {!loading && error && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && !error && routines && routines.length === 0 && (
        <EmptyState title="No routines yet">
          Create your first routine above to start planning workouts.
        </EmptyState>
      )}

      {!loading && !error && routines && routines.length > 0 && (
        <ul className="routine-list">
          {routines.map((r) => (
            <li key={r.id}>
              <Link to={`/routines/${r.id}`} className="routine-row">
                <span className="routine-name">{r.name}</span>
                <span className="routine-chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
