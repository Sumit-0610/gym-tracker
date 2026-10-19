import { useRef, useState } from 'react';
import { useAuth } from '../auth';
import { Link } from '../router';
import { ApiError } from '../api';
import { describeError } from '../format';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './auth-pages.css';

// Step 2 of a password reset: opened from the emailed link,
// /reset-password?token=<token>. On success the server signs this browser in
// and AuthProvider goes to the dashboard. Other devices stay signed in.
export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get('token') || '',
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    if (password.length < 6) {
      setError(new ApiError(400, 'Password must be at least 6 characters.'));
      return;
    }
    if (password !== confirm) {
      setError(new ApiError(400, 'The two passwords do not match.'));
      return;
    }

    inFlight.current = true;
    setError(null);
    setPending(true);
    try {
      await resetPassword(token, password);
      // success: AuthProvider navigates away, this component unmounts
    } catch (err) {
      inFlight.current = false;
      setPending(false);
      setError(err instanceof ApiError ? err : new ApiError(0));
    }
  }

  const message = error && describeError(error);

  return (
    <div className="page auth-page">
      <h1>Choose a new password</h1>
      <Card>
        {token ? (
          <form onSubmit={onSubmit} noValidate className="auth-form">
            <Input
              label="New password"
              type="password"
              value={password}
              autoComplete="new-password"
              hint="At least 6 characters."
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
            {message && (
              <p className="auth-error" role="alert">
                {message}
              </p>
            )}
            <Button type="submit" pending={pending} className="btn-block">
              Save new password
            </Button>
          </form>
        ) : (
          <p className="auth-done">
            This page needs the link from your reset email. Open the link from
            the email again, or ask for a new one.
          </p>
        )}
      </Card>
      <p className="auth-switch">
        Link expired? <Link to="/forgot-password">Send a new one</Link>
      </p>
    </div>
  );
}
