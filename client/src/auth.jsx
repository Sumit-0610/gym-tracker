// Authentication state for the whole app.
//
// The key idea: the browser holds an httpOnly session cookie that JavaScript
// cannot read. So the frontend cannot know "am I logged in?" by looking at a
// local variable — it has to ASK the server (GET /api/me). We do that once when
// the app loads. That single request is why a page refresh keeps you logged in:
// the state is rebuilt from the cookie every time, never persisted in JS or
// localStorage.
//
//   cookie (sent automatically)  →  GET /api/me  →  200 user / 401  →  status

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, setUnauthorizedHandler } from './api';
import { useNavigate } from './router';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  // 'loading'       — the initial GET /api/me hasn't resolved yet
  // 'authenticated' — we have a user
  // 'anonymous'     — no valid session
  const [status, setStatus] = useState('loading');

  // Establish auth state on first load.
  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setStatus('anonymous');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One global reaction to a 401 from ANY api call (e.g. the session expired
  // while the app was open). Clear state and bounce to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  const login = useCallback(
    async (username, password) => {
      const u = await api.login(username, password);
      setUser(u);
      setStatus('authenticated');
      navigate('/', { replace: true });
    },
    [navigate]
  );

  const signup = useCallback(
    async (username, password) => {
      // The backend logs the user in as part of signup (sets the session).
      const u = await api.signup(username, password);
      setUser(u);
      setStatus('authenticated');
      navigate('/', { replace: true });
    },
    [navigate]
  );

  // Update a preference (e.g. weight unit) and refresh the local user object
  // from the server's response — same pattern as login/signup.
  const updatePreferences = useCallback(async (prefs) => {
    const u = await api.updatePreferences(prefs);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Even if the request fails, clear local state — the user asked to leave.
    }
    setUser(null);
    setStatus('anonymous');
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ user, status, login, signup, logout, updatePreferences }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
