import { useState } from 'react';
import { useAuth } from '../auth';
import { Link } from '../router';
import { ApiError } from '../api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './auth-pages.css';

// Data flow when you press "Log in":
//   submit event → preventDefault (no full-page POST) → api.login() → fetch
//   POST /api/login → Express verifies bcrypt hash, sets req.session.userId,
//   sends Set-Cookie → 200 {id,username} → AuthProvider stores user + navigates
//   to "/". On failure we catch the ApiError and show a message; the form stays.
export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    // Frontend validation is for fast feedback only — the backend re-checks.
    if (!username.trim() || !password) {
      setError(new ApiError(400, 'Enter your username and password.'));
      return;
    }

    setError(null);
    setPending(true);
    try {
      await login(username.trim(), password);
      // success: AuthProvider navigates away, this component unmounts
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err : new ApiError(0));
    }
  }

  const message =
    error?.status === 401
      ? 'Invalid username or password.'
      : error?.message;

  return (
    <div className="page auth-page">
      <h1>Gym Tracker</h1>
      <Card>
        <form onSubmit={onSubmit} noValidate className="auth-form">
          <Input
            label="Username"
            value={username}
            autoComplete="username"
            autoCapitalize="none"
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {message && (
            <p className="auth-error" role="alert">
              {message}
            </p>
          )}
          <Button type="submit" pending={pending} className="btn-block">
            Log in
          </Button>
        </form>
      </Card>
      <p className="auth-switch">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
