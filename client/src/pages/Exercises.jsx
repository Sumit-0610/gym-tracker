import { useMemo, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import Input from '../components/Input';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Exercises.css';

export default function Exercises() {
  // SERVER STATE — the exercise library, fetched once when the page mounts.
  const { data: exercises, error, loading, reload } = useApi(
    () => api.exercises(),
    []
  );

  // UI STATE — the search term. Local and ephemeral; the server knows nothing
  // about it.
  const [search, setSearch] = useState('');

  // DERIVED DATA — NOT state. Recomputed from (exercises + search) every render.
  // useMemo only skips the work when neither input changed. If we stored this
  // in useState we'd have two sources of truth that could drift out of sync.
  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.muscle_group && e.muscle_group.toLowerCase().includes(q))
    );
  }, [exercises, search]);

  const hasLibrary = exercises && exercises.length > 0;

  return (
    <div className="page">
      <h1>Exercises</h1>

      {hasLibrary && (
        <Input
          label="Search"
          type="search"
          placeholder="Name or muscle group"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* State 1 — still loading */}
      {loading && <Spinner label="Loading exercises…" />}

      {/* State 2 — the request failed */}
      {!loading && error && <ErrorMessage error={error} onRetry={reload} />}

      {/* State 3 — request OK, the library itself is empty */}
      {!loading && !error && exercises && exercises.length === 0 && (
        <EmptyState title="No exercises available">
          The exercise library has not been set up yet.
        </EmptyState>
      )}

      {/* State 4 — library has exercises, but none match the search.
          Deliberately NOT the generic empty state — the cause is different. */}
      {!loading && !error && hasLibrary && filtered.length === 0 && (
        <p className="exercises-nomatch" role="status">
          No exercises match “{search.trim()}”.
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="exercise-list">
          {filtered.map((e) => (
            <li key={e.id} className="exercise-row">
              <span className="exercise-name">{e.name}</span>
              {e.muscle_group && (
                <span className="exercise-muscle">{e.muscle_group}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
