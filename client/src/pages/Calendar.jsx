import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { Link } from '../router';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Calendar.css';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_SHOWN = 3;

function monthGrid(year, month, byDate, todayIso) {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-based offset
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, iso, entry: byDate.get(iso), today: iso === todayIso });
  }
  return cells;
}

export default function Calendar() {
  const cal = useApi(() => api.calendar(120), []);
  const stats = useApi(() => api.stats(), []);

  if (cal.loading) return <Spinner full label="Loading your calendar…" />;
  if (cal.error) {
    return (
      <div className="page">
        <p><Link to="/">‹ Home</Link></p>
        <h1>Calendar</h1>
        <ErrorMessage error={cal.error} onRetry={cal.reload} />
      </div>
    );
  }

  const byDate = new Map(cal.data.map((e) => [e.date, e]));
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const months = [];
  for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push([m.getUTCFullYear(), m.getUTCMonth()]);
  }

  const totalDays = cal.data.length;
  const s = stats.data;

  return (
    <div className="page">
      <p><Link to="/">‹ Home</Link></p>
      <h1>Calendar</h1>

      {(s?.week_streak > 0 || totalDays > 0) && (
        <div className="cal-summary">
          {s?.week_streak > 0 && (
            <span>🔥 {s.week_streak}-week streak</span>
          )}
          <span>{totalDays} training {totalDays === 1 ? 'day' : 'days'} logged</span>
        </div>
      )}

      {totalDays === 0 && (
        <EmptyState title="No workouts yet">
          Days you train will be marked here.
        </EmptyState>
      )}

      {months.map(([y, m]) => {
        const cells = monthGrid(y, m, byDate, todayIso);
        const label = new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        });
        return (
          <section key={`${y}-${m}`} className="cal-month">
            <h2>{label}</h2>
            <div className="cal-grid">
              {WD.map((w) => (
                <div key={w} className="cal-wd">{w}</div>
              ))}
              {cells.map((c, i) =>
                c === null ? (
                  <div key={`x${i}`} className="cal-cell cal-cell-empty" />
                ) : (
                  <div
                    key={c.iso}
                    className={
                      'cal-cell' +
                      (c.entry ? ' cal-cell-active' : '') +
                      (c.today ? ' cal-cell-today' : '')
                    }
                    title={c.entry ? `${c.entry.label}${c.entry.count > 1 ? ` ×${c.entry.count}` : ''}` : undefined}
                  >
                    <span className="cal-day">{c.d}</span>
                    {c.entry && (
                      <span className="cal-label">{c.entry.label}</span>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
