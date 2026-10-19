import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { Link } from '../router';
import { api, ApiError } from '../api';
import { describeError } from '../format';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import './auth-pages.css';

// Opened from the "verify your email" link: /verify-email?token=<token>.
// Confirms the token as soon as the page loads; works signed in or not.
export default function VerifyEmail() {
  const { status, setUserFromServer } = useAuth();
  const [state, setState] = useState({ phase: 'working', error: null });
  const sent = useRef(false);

  useEffect(() => {
    // Once only, even if React runs effects twice in development: a second
    // call would find the link already used and show an error.
    if (sent.current) return;
    sent.current = true;
    const token =
      new URLSearchParams(window.location.search).get('token') || '';
    if (!token) {
      setState({
        phase: 'error',
        error: new ApiError(400, 'This page needs the link from your email.'),
      });
      return;
    }
    api
      .verifyEmail(token)
      .then((res) => {
        setUserFromServer(res.user);
        setState({ phase: 'done', error: null });
      })
      .catch((err) =>
        setState({
          phase: 'error',
          error: err instanceof ApiError ? err : new ApiError(0),
        }),
      );
  }, [setUserFromServer]);

  const next =
    status === 'authenticated' ? (
      <Link to="/settings">Back to Settings</Link>
    ) : (
      <Link to="/login">Log in</Link>
    );

  return (
    <div className="page auth-page">
      <h1>Verify email</h1>
      <Card>
        {state.phase === 'working' && <Spinner label="Verifying…" />}
        {state.phase === 'done' && (
          <p className="auth-done" role="status">
            Your email is verified. Thanks!
          </p>
        )}
        {state.phase === 'error' && (
          <p className="auth-error" role="alert">
            {describeError(state.error)}
          </p>
        )}
      </Card>
      <p className="auth-switch">{next}</p>
    </div>
  );
}
