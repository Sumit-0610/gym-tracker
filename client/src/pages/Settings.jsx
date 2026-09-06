import { useState } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import Card from '../components/Card';
import ErrorMessage from '../components/ErrorMessage';
import './Settings.css';

// Small preferences screen. Right now it's just the weight unit; the shape
// leaves room for more (rest-timer default, timezone, …) later.
export default function Settings() {
  const { user, updatePreferences } = useAuth();

  const [unit, setUnit] = useState(user?.weight_unit || 'kg');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(0);

  async function choose(next) {
    if (next === unit || saving) return;
    const previous = unit;
    setUnit(next); // optimistic
    setError(null);
    setSaving(true);
    try {
      await updatePreferences({ weight_unit: next });
      setSavedAt(Date.now());
    } catch (err) {
      setUnit(previous); // revert on failure
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setSaving(false);
    }
  }

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
              disabled={saving}
              onChange={() => choose('kg')}
            />
            <span>Kilograms (kg)</span>
          </label>
          <label className="settings-option">
            <input
              type="radio"
              name="weight_unit"
              checked={unit === 'lb'}
              disabled={saving}
              onChange={() => choose('lb')}
            />
            <span>Pounds (lb)</span>
          </label>

          {error && <ErrorMessage error={error} />}
          {!error && savedAt > 0 && !saving && (
            <p className="settings-saved" role="status">
              Saved.
            </p>
          )}
        </fieldset>
      </Card>
    </div>
  );
}
