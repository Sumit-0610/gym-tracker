import { useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { fromKg, toKg, formatDay } from '../format';
import { Link } from '../router';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './Measures.css';

const today = () => new Date().toISOString().slice(0, 10);

// A tiny weight-over-time sparkline. Oldest -> newest, left -> right.
function Sparkline({ points, unit }) {
  if (points.length < 2) return null;
  const W = 300;
  const H = 60;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => fromKg(p.weight, unit));
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const y = (v) => H - 4 - ((v - lo) / span) * (H - 8);
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y(ys[i]).toFixed(1)}`).join(' ');
  return (
    <svg className="measures-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--c-primary)" strokeWidth="2" />
      <circle cx={xs[xs.length - 1]} cy={y(ys[ys.length - 1])} r="3" fill="var(--c-primary)" />
    </svg>
  );
}

export default function Measures() {
  const { user } = useAuth();
  const unit = user?.weight_unit || 'kg';

  const list = useApi(() => api.measurements(), []);

  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError(new ApiError(400, `Enter a weight in ${unit}.`));
      return;
    }
    inFlight.current = true;
    setError(null);
    setSaving(true);
    try {
      await api.logMeasurement(toKg(w, unit), date);
      setWeight('');
      list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const del = (id) => api.deleteMeasurement(id).then(() => list.reload());

  return (
    <div className="page">
      <p><Link to="/">‹ Home</Link></p>
      <h1>Measures</h1>
      <p className="measures-sub">Bodyweight log. One entry per day.</p>

      <Card as="form" onSubmit={onSubmit} className="measures-form">
        <div className="measures-row">
          <Input
            label={`Weight (${unit})`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {error && <ErrorMessage error={error} />}
        <Button type="submit" pending={saving} pendingLabel="Saving…" className="btn-block">
          Log weight
        </Button>
      </Card>

      {list.loading && <Spinner label="Loading…" />}
      {list.error && <ErrorMessage error={list.error} onRetry={list.reload} />}

      {list.data && list.data.length === 0 && (
        <EmptyState title="Nothing logged yet">
          Add your bodyweight above to start tracking it.
        </EmptyState>
      )}

      {list.data && list.data.length > 0 && (
        <>
          <Sparkline points={[...list.data].reverse()} unit={unit} />
          <ul className="measures-list">
            {list.data.map((m) => (
              <li key={m.id}>
                <span className="measures-date">{formatDay(m.date)}</span>
                <span className="measures-weight">
                  {fromKg(m.weight, unit)} {unit}
                </span>
                <button
                  type="button"
                  className="measures-del"
                  onClick={() => del(m.id)}
                  aria-label={`Delete entry for ${m.date}`}
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
