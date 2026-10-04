import { useState } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import { formatDuration } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import './Settings.css';

const REST_MIN = 15;
const REST_MAX = 600;
const REST_STEP = 15;

// Preferences screen: weight unit, default rest-timer length and the AI coach
// recap opt-in. All saved server-side (PATCH /api/me) so they follow the
// account across devices.
export default function Settings() {
  const { user, updatePreferences } = useAuth();

  const [unit, setUnit] = useState(user?.weight_unit || 'kg');
  const [rest, setRest] = useState(user?.rest_seconds ?? 120);
  const [aiOn, setAiOn] = useState(Boolean(user?.ai_enabled));
  const [savingWhat, setSavingWhat] = useState(null); // 'unit' | 'rest' | 'ai' | null
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(0);

  async function save(what, patch, revert) {
    if (savingWhat) return;
    setError(null);
    setSavingWhat(what);
    try {
      await updatePreferences(patch);
      setSavedAt(Date.now());
    } catch (err) {
      revert();
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setSavingWhat(null);
    }
  }

  function chooseUnit(next) {
    if (next === unit) return;
    const prev = unit;
    setUnit(next);
    save('unit', { weight_unit: next }, () => setUnit(prev));
  }

  function changeRest(delta) {
    const next = Math.min(REST_MAX, Math.max(REST_MIN, rest + delta));
    if (next === rest) return;
    const prev = rest;
    setRest(next);
    save('rest', { rest_seconds: next }, () => setRest(prev));
  }

  function toggleAi(next) {
    const prev = aiOn;
    setAiOn(next);
    save('ai', { ai_enabled: next }, () => setAiOn(prev));
  }

  const busy = savingWhat !== null;

  return (
    <div className="page">
      <h1>Settings</h1>

      <Card>
        <p className="settings-account">
          Signed in as <strong>{user?.username}</strong>
        </p>
      </Card>

      <Card>
        <fieldset className="settings-group">
          <legend>Weight unit</legend>
          <p className="settings-hint">
            Weights are always stored the same way — this only changes how they
            are shown and entered.
          </p>

          <label className="settings-option">
            <input
              type="radio"
              name="weight_unit"
              checked={unit === 'kg'}
              disabled={busy}
              onChange={() => chooseUnit('kg')}
            />
            <span>Kilograms (kg)</span>
          </label>
          <label className="settings-option">
            <input
              type="radio"
              name="weight_unit"
              checked={unit === 'lb'}
              disabled={busy}
              onChange={() => chooseUnit('lb')}
            />
            <span>Pounds (lb)</span>
          </label>
        </fieldset>
      </Card>

      <Card>
        <fieldset className="settings-group">
          <legend>Rest timer</legend>
          <p className="settings-hint">
            How long the between-sets timer counts down by default. You can
            still nudge it mid-set during a workout.
          </p>
          <div className="settings-stepper">
            <Button
              variant="secondary"
              onClick={() => changeRest(-REST_STEP)}
              disabled={busy || rest <= REST_MIN}
              aria-label={`${REST_STEP} seconds less`}
            >
              −{REST_STEP}s
            </Button>
            <span className="settings-stepper-value" aria-live="polite">
              {formatDuration(rest)}
            </span>
            <Button
              variant="secondary"
              onClick={() => changeRest(REST_STEP)}
              disabled={busy || rest >= REST_MAX}
              aria-label={`${REST_STEP} seconds more`}
            >
              +{REST_STEP}s
            </Button>
          </div>
        </fieldset>
      </Card>

      {user?.ai_available && (
        <Card>
          <fieldset className="settings-group">
            <legend>AI coach recap</legend>
            <p className="settings-hint">
              After you finish a workout, an AI writes a short recap with one or
              two tips. Only your workout numbers, exercise names and muscle
              groups are sent to the AI provider, never your username.
            </p>
            <label className="settings-option">
              <input
                type="checkbox"
                checked={aiOn}
                disabled={busy}
                onChange={(e) => toggleAi(e.target.checked)}
              />
              <span>Write a recap after each workout</span>
            </label>
          </fieldset>
        </Card>
      )}

      {error && <ErrorMessage error={error} />}
      {!error && savedAt > 0 && !busy && (
        <p className="settings-saved" role="status">
          Saved.
        </p>
      )}
    </div>
  );
}
