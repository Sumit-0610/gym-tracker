import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { Link } from '../router';
import { formatDay, formatWeight } from '../format';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ProgressChart from '../components/ProgressChart';
import './ExerciseProgress.css';

// One lift's history: personal records, an estimated-1RM trend, and every
// session. `id` is the route param from "/exercises/:id".
export default function ExerciseProgress({ id }) {
  const { user } = useAuth();
  const unit = user?.weight_unit || 'kg';

  const { data, loading, error, reload } = useApi(
    () => api.exerciseProgress(id),
    [id],
  );

  if (loading && !data) return <Spinner full label="Loading progress…" />;

  if (error) {
    return (
      <div className="page">
        <p>
          <Link to="/exercises">‹ Exercises</Link>
        </p>
        {error.status === 404 ? (
          <EmptyState title="Exercise not found">
            This exercise doesn’t exist.
          </EmptyState>
        ) : (
          <ErrorMessage error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  const { exercise, sessions, prs, stalled } = data;
  const trend = sessions
    .filter((s) => s.best_e1rm !== null)
    .map((s) => ({ date: s.date, value: s.best_e1rm }));

  return (
    <div className="page">
      <p>
        <Link to="/exercises">‹ Exercises</Link>
      </p>
      <header className="ep-head">
        <h1>{exercise.name}</h1>
        {exercise.muscle_group && (
          <span className="ep-muscle">{exercise.muscle_group}</span>
        )}
      </header>

      {sessions.length === 0 ? (
        <EmptyState title="No sets logged yet">
          Log a working set of this exercise and your records and progress will
          show up here. Warm-ups don’t count.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="ep-prs">
            <h2 id="ep-prs">Personal records</h2>
            <div className="ep-prs">
              <PrCard
                title="Est. 1RM"
                pr={prs.e1rm}
                format={(v) => formatWeight(v, unit)}
              />
              <PrCard
                title="Heaviest set"
                pr={prs.weight}
                format={(v) => formatWeight(v, unit)}
              />
              <PrCard
                title="Best set volume"
                pr={prs.volume}
                format={(v) => formatWeight(v, unit)}
              />
            </div>
          </section>

          {stalled && (
            <p className="ep-stalled" role="status">
              No new best in your last 4 sessions. A lighter week, a technique
              check or a different rep range can help — it’s a nudge, not a
              rule.
            </p>
          )}

          {trend.length > 0 && (
            <section aria-labelledby="ep-trend">
              <h2 id="ep-trend">Estimated 1RM</h2>
              <Card>
                <ProgressChart
                  points={trend}
                  unit={unit}
                  label="Estimated one-rep max"
                />
                <p className="ep-foot">
                  Estimated with the Epley formula from your best set each
                  session. Only sets of 12 reps or fewer are counted.
                </p>
              </Card>
            </section>
          )}

          <section aria-labelledby="ep-sessions">
            <h2 id="ep-sessions">Sessions</h2>
            <ul className="ep-sessions">
              {[...sessions].reverse().map((s) => (
                <li key={s.workout_id}>
                  <Link to={`/history/${s.workout_id}`} className="ep-session">
                    <span className="ep-session-date">{formatDay(s.date)}</span>
                    <span className="ep-session-detail">
                      {s.sets} {s.sets === 1 ? 'set' : 'sets'} · top{' '}
                      {formatWeight(s.top_weight, unit)}
                      {s.best_e1rm !== null && (
                        <> · 1RM {formatWeight(s.best_e1rm, unit)}</>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function PrCard({ title, pr, format }) {
  return (
    <div className="ep-pr">
      <span className="ep-pr-title">{title}</span>
      <span className="ep-pr-value">{pr ? format(pr.value) : '—'}</span>
      {pr && <span className="ep-pr-date">{formatDay(pr.date)}</span>}
    </div>
  );
}
