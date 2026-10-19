import { useRef, useState } from 'react';
import { Link } from '../router';
import { api, ApiError } from '../api';
import { describeError } from '../format';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './auth-pages.css';

// Step 1 of a password reset: ask for the account's email. The server answers
// the same way whether or not an account has that email (so this form can't be
// used to find out who has an account), so the success message is worded as
// "if".
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!email.trim()) {
      setError(new ApiError(400, 'Enter the email on your account.'));
      return;
    }

    inFlight.current = true;
    setError(null);
    setPending(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  // 503 = this server has no email provider; its message says so plainly.
  const message =
    error?.status === 503 && error.message
      ? error.message
      : error && describeError(error);

  return (
    <div className="page auth-page">
      <h1>Forgot password</h1>
      <Card>
        {sent ? (
          <p className="auth-done" role="status">
            If an account has the email <strong>{email.trim()}</strong>, a link
            to reset its password is on its way. The link works for 30 minutes.
            Check your spam folder if it doesn&apos;t arrive.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="auth-form">
            <p className="auth-intro">
              Enter the email on your account and we&apos;ll send you a link to
              choose a new password.
            </p>
            <Input
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              autoCapitalize="none"
              onChange={(e) => setEmail(e.target.value)}
            />
            {message && (
              <p className="auth-error" role="alert">
                {message}
              </p>
            )}
            <Button type="submit" pending={pending} className="btn-block">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
      <p className="auth-switch">
        Remembered it? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
