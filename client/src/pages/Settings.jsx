import { useState } from 'react';
import { useAuth } from '../auth';
import { api, ApiError } from '../api';
import { Link } from '../router';
import { describeError, formatDuration } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ErrorMessage from '../components/ErrorMessage';
import ExportCard from '../components/ExportCard';
import './Settings.css';

const REST_MIN = 15;
const REST_MAX = 600;
const REST_STEP = 15;

// Preferences screen: weight unit, default rest-timer length and the AI coach
// recap opt-in, plus the account email used for password resets. All saved server-side (PATCH /api/me) so they follow the
// account across devices. Below them, the data export.
export default function Settings() {
  const { user, updatePreferences } = useAuth();

  const [unit, setUnit] = useState(user?.weight_unit || 'kg');
  const [rest, setRest] = useState(user?.rest_seconds ?? 120);
  const [aiOn, setAiOn] = useState(Boolean(user?.ai_enabled));
  const [savingWhat, setSavingWhat] = useState(null); // 'unit' | 'rest' | 'ai' | null
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(0);
  const [email, setEmail] = useState(user?.email || '');
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSaved, setEmailSaved] = useState(false);
  const [verify, setVerify] = useState({
    pending: false,
    sent: false,
    error: null,
  });

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
  const emailChanged = email.trim().toLowerCase() !== (user?.email || '');

  // The email has its own Save button (typing shouldn't save on every key)
  // and its own messages, so a taken-email error shows next to the field.
  async function saveEmail(e) {
    e.preventDefault();
    if (emailPending || !emailChanged) return;
    setEmailError(null);
    setEmailSaved(false);
    setEmailPending(true);
    try {
      const u = await updatePreferences({ email: email.trim() });
      setEmail(u.email || '');
      setEmailSaved(true);
      setVerify({ pending: false, sent: false, error: null });
    } catch (err) {
      setEmailError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setEmailPending(false);
    }
  }

  async function sendVerify() {
    if (verify.pending) return;
    setVerify({ pending: true, sent: false, error: null });
    try {
      await api.sendVerifyEmail();
      setVerify({ pending: false, sent: true, error: null });
    } catch (err) {
      setVerify({
        pending: false,
        sent: false,
        error: err instanceof ApiError ? err : new ApiError(0),
      });
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <Card>
        <p className="settings-account">
          Signed in as <strong>{user?.username}</strong>
        </p>
        {user?.is_admin && (
          <p className="settings-admin">
            <Link to="/admin">Open the admin page</Link>
          </p>
        )}
      </Card>

      <Card>
        <form className="settings-group" onSubmit={saveEmail} noValidate>
          <p className="settings-legend">Email</p>
          <p className="settings-hint">
            {user?.email
              ? 'Where a link goes if you forget your password.'
              : 'Add one so you can reset your password if you forget it.'}{' '}
            Only the app's admin can see it.
          </p>
          <Input
            label="Email address"
            type="email"
            value={email}
            autoComplete="email"
            autoCapitalize="none"
            error={emailError ? describeError(emailError) : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailSaved(false);
            }}
          />
          <div className="settings-email-actions">
            <Button
              type="submit"
              variant="secondary"
              pending={emailPending}
              pendingLabel="Saving…"
              disabled={!emailChanged}
            >
              {email.trim() === '' && user?.email
                ? 'Remove email'
                : 'Save email'}
            </Button>
            {emailSaved && !emailChanged && (
              <span className="settings-saved" role="status">
                Saved.
              </span>
            )}
          </div>
          {user?.email && !emailChanged && (
            <div className="settings-verify">
              {user.email_verified ? (
                <p className="settings-verified">✓ Verified</p>
              ) : verify.sent ? (
                <p className="settings-hint" role="status">
                  Check {user.email} for a link to verify it. The link works for
                  24 hours.
                </p>
              ) : (
                <>
                  <p className="settings-hint">
                    Not verified yet. Verifying proves the address is yours.
                  </p>
                  {user.email_available && (
                    <Button
                      variant="secondary"
                      pending={verify.pending}
                      pendingLabel="Sending…"
                      onClick={sendVerify}
                    >
                      Send verify link
                    </Button>
                  )}
                </>
              )}
              {verify.error && <ErrorMessage error={verify.error} />}
            </div>
          )}
        </form>
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

      <ExportCard user={user} />
    </div>
  );
}
