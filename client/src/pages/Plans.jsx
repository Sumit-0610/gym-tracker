import { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { Link } from '../router';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import { LEVELS, planMeta } from './plans';
import './Plans.css';

// Browse the suggested plans, one level at a time.
export default function Plans() {
  const [level, setLevel] = useState('beginner');
  const { data: plans, error, loading, reload } = useApi(() => api.plans(), []);

  const current = LEVELS.find((l) => l.id === level);
  const shown = (plans || []).filter((p) => p.level === level);

  return (
    <div className="page">
      <p>
        <Link to="/routines">‹ My routines</Link>
      </p>
      <h1>Suggested plans</h1>
      <p className="plans-intro">
        Ready-made programs. Pick one and add it to your routines in one tap.
      </p>

      {/* A tab list: one level visible at a time keeps the screen short. */}
      <div className="level-tabs" role="tablist" aria-label="Experience level">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === level}
            className={
              l.id === level ? 'level-tab level-tab-active' : 'level-tab'
            }
            onClick={() => setLevel(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="level-blurb">{current.blurb}</p>

      {loading && <Spinner label="Loading plans…" />}
      {!loading && error && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && !error && (
        <ul className="plan-list" role="tabpanel">
          {shown.map((p) => (
            <li key={p.id}>
              <Link to={`/routines/plans/${p.id}`} className="plan-card">
                <span className="plan-split">{p.split}</span>
                <span className="plan-name">{p.name}</span>
                <span className="plan-meta">{planMeta(p)}</span>
                <span className="plan-summary">{p.summary}</span>
                <span className="plan-workouts">
                  {p.workouts.map((w) => (
                    <span key={w.name} className="plan-chip">
                      {w.name}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
