import { useState } from 'react';
import { useAuth } from '../auth';
import { Link } from '../router';
import { ApiError } from '../api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './auth-pages.css';

// POST /api/signup hashes the password with bcrypt, inserts the user, and logs
// them in (sets the session) in one step — so on success we go straight to the
// dashboard, same as login.
export default function Signup() {
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    if (!username.trim()) {
      setError(new ApiError(400, 'Choose a username.'));
      return;
    }
    if (password.length < 6) {
      setError(new ApiError(400, 'Password must be at least 6 characters.'));
      return;
    }

    setError(null);
    setPending(true);
    try {
      await signup(username.trim(), password);
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err : new ApiError(0));
    }
  }

  const message =
    error?.status === 409
      ? 'That username is already taken.'
      : error?.message;

  return (
    <div className="page auth-page">
      <h1>Create account</h1>
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
            autoComplete="new-password"
            hint="At least 6 characters."
            onChange={(e) => setPassword(e.target.value)}
          />
          {message && (
            <p className="auth-error" role="alert">
              {message}
            </p>
          )}
          <Button type="submit" pending={pending} className="btn-block">
            Sign up
          </Button>
        </form>
      </Card>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
