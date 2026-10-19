import { useState } from 'react';
import { api, ApiError } from '../api';
import { todayLocal } from '../format';
import { PRESETS, presetRange } from '../exportRange';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import ErrorMessage from './ErrorMessage';
import './ExportCard.css';

const EMAIL_KEY = 'gym-tracker:export-email';

// Remembered per browser for convenience; storage can be blocked, so never
// let it break the form.
function readEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}
function rememberEmail(email) {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // ignore
  }
}

// Settings → Export data, as a card. The same form also opens in a modal from
// the export icon on Home (see ExportModal).
export default function ExportCard({ user }) {
  return (
    <Card>
      <fieldset className="settings-group">
        <legend>Export data</legend>
        <ExportForm user={user} />
      </fieldset>
    </Card>
  );
}

// Pick a date range and a format, then download the file or (when the server
// has email set up) send it to an address.
export function ExportForm({ user }) {
  const today = todayLocal();
  const [range, setRange] = useState(() => presetRange('30d', today));
  const [format, setFormat] = useState('csv');
  const [email, setEmail] = useState(readEmail);
  const [pending, setPending] = useState(null); // 'download' | 'email' | null
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const rangeError =
    range.from && range.to && range.from > range.to
      ? 'The start date must be on or before the end date.'
      : null;
  const ready = Boolean(range.from && range.to) && !rangeError && !pending;

  function choosePreset(id) {
    setRange(presetRange(id, today, user?.created_at));
    setNotice('');
  }

  async function run(what, action) {
    setError(null);
    setNotice('');
    setPending(what);
    try {
      setNotice(await action());
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      setPending(null);
    }
  }

  const download = () =>
    run('download', async () => {
      await api.downloadExport({ ...range, format });
      return 'Download started.';
    });

  const send = (e) => {
    e.preventDefault();
    const to = email.trim();
    run('email', async () => {
      const res = await api.emailExport({ ...range, format, email: to });
      rememberEmail(to);
      return `Sent to ${to}: ${res.workouts} workouts, ${res.sets} sets.`;
    });
  };

  return (
    <div className="export">
      <p className="settings-hint">
        Your workouts and sets for a date range. CSV opens in any spreadsheet
        (one row per set); JSON also includes your bodyweight log. Weights are
        in {user?.weight_unit === 'lb' ? 'lb' : 'kg'}.
      </p>

      <div className="export-presets" role="group" aria-label="Quick ranges">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="export-preset"
            onClick={() => choosePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="export-dates">
        <Input
          label="From"
          type="date"
          value={range.from}
          max={today}
          onChange={(e) => setRange({ ...range, from: e.target.value })}
          required
        />
        <Input
          label="To"
          type="date"
          value={range.to}
          max={today}
          onChange={(e) => setRange({ ...range, to: e.target.value })}
          error={rangeError}
          required
        />
      </div>

      <div className="export-formats" role="radiogroup" aria-label="Format">
        <label className="settings-option">
          <input
            type="radio"
            name="export_format"
            checked={format === 'csv'}
            onChange={() => setFormat('csv')}
          />
          <span>CSV</span>
        </label>
        <label className="settings-option">
          <input
            type="radio"
            name="export_format"
            checked={format === 'json'}
            onChange={() => setFormat('json')}
          />
          <span>JSON</span>
        </label>
      </div>

      <Button
        onClick={download}
        disabled={!ready}
        pending={pending === 'download'}
        pendingLabel="Preparing…"
      >
        Download
      </Button>

      {user?.email_available && (
        <form className="export-email" onSubmit={send}>
          <Input
            label="Or email it to"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!ready || !email.trim()}
            pending={pending === 'email'}
            pendingLabel="Sending…"
          >
            Send email
          </Button>
        </form>
      )}

      {error && <ErrorMessage error={error} />}
      {!error && notice && (
        <p className="settings-saved" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
