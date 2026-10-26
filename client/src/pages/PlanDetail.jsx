import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { Link } from '../router';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { levelLabel, planMeta } from './plans';
import './Plans.css';

// Copies the plan into the user's routines. Once done (now or on an earlier
// visit) it turns into a link to the routines list.
function StartPlan({ plan }) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(null);
  const inFlight = useRef(false); // see the note in Routines.jsx

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setPending(true);
    try {
      const res = await api.startPlan(plan.id);
      // Kept locally rather than re-fetching the plan: a re-fetch would
      // swap this card for "you already have this plan".
      setCreated(res.routines);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (created || plan.started) {
    const count = created ? created.length : plan.workouts.length;
    const prefix = plan.workouts[0].routine_name.split(' · ')[0];
    return (
      <Card className="plan-start plan-start-done" role="status">
        <p>
          <strong>{created ? 'Added!' : 'Already in your routines.'}</strong>{' '}
          Look for the {count} routines starting with “{prefix}”.
        </p>
        <Link to="/routines" className="btn btn-primary btn-block">
          Go to my routines
        </Link>
      </Card>
    );
  }

  return (
    <Card className="plan-start">
      <p>
        Adds {plan.workouts.length} routine
        {plan.workouts.length === 1 ? '' : 's'} to your account, with these sets
        and reps as targets. You can add exercises to them afterwards.
      </p>
      {error && <ErrorMessage error={error} />}
      <Button
        className="btn-block"
        pending={pending}
        pendingLabel="Adding…"
        onClick={start}
      >
        Add to my routines
      </Button>
    </Card>
  );
}

// `id` is the route parameter from "/routines/plans/:id".
export default function PlanDetail({ id }) {
  const {
    data: plan,
    error,
    loading,
    reload,
  } = useApi(() => api.plan(id), [id]);

  return (
    <div className="page">
      <p>
        <Link to="/routines/plans">‹ All plans</Link>
      </p>

      {loading && <Spinner label="Loading plan…" />}
      {!loading &&
        error &&
        (error.status === 404 ? (
          <EmptyState title="Plan not found">
            There is no suggested plan at this address.
          </EmptyState>
        ) : (
          <ErrorMessage error={error} onRetry={reload} />
        ))}

      {!loading && !error && plan && (
        <>
          <p className="plan-split">
            {levelLabel(plan.level)} · {plan.split}
          </p>
          <h1>{plan.name}</h1>
          <p className="plan-meta">{planMeta(plan)}</p>
          <p>{plan.summary}</p>

          <dl className="plan-facts">
            <dt>Schedule</dt>
            <dd>{plan.schedule}</dd>
            <dt>How to progress</dt>
            <dd>{plan.progression}</dd>
          </dl>

          <StartPlan plan={plan} />

          {plan.workouts.map((w) => (
            <section key={w.name} className="plan-workout">
              <h2>
                {w.name} <span className="plan-workout-focus">{w.focus}</span>
              </h2>
              <ul className="plan-exercise-list">
                {w.exercises.map((ex, i) => (
                  <li key={`${ex.id}-${i}`} className="plan-exercise">
                    {ex.image_url ? (
                      <img
                        className="exercise-thumb"
                        src={ex.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="exercise-thumb" aria-hidden="true" />
                    )}
                    <span className="plan-exercise-info">
                      <Link
                        to={`/exercises/${ex.id}`}
                        className="plan-exercise-name"
                      >
                        {ex.name}
                      </Link>
                      <span className="plan-exercise-muscle">
                        {ex.muscle_group}
                      </span>
                    </span>
                    <span className="plan-exercise-target">
                      {ex.target_sets} × {ex.target_reps}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
