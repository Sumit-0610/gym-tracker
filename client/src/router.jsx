// A ~90-line client-side router built on the browser History API.
//
// Concept: a single-page app never actually loads a second HTML page. Instead
// JavaScript changes the URL bar with history.pushState() and swaps which
// component is rendered. The browser fires a 'popstate' event when the user
// presses Back/Forward; we listen for that and re-render accordingly.
//
//   URL in the address bar  →  matchPath() picks a route  →  that component renders
//
// We hand-roll this instead of using react-router: it's one concept to learn,
// zero dependencies, and it's enough for ~9 static routes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const RouterContext = createContext(null);

export function Router({ children }) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    // Fired on Back/Forward. pushState/replaceState do NOT fire it, so our own
    // navigate() updates state directly (below).
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <Router>');
  return ctx;
}

export function useNavigate() {
  return useRouter().navigate;
}

// "/routines/:id" + "/routines/42"  ->  { id: "42" }
// "/routines/:id" + "/exercises"    ->  null   (no match)
export function matchPath(pattern, path) {
  const pp = pattern.split('/');
  const ap = path.split('/');
  if (pp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    } else if (pp[i] !== ap[i]) {
      return null;
    }
  }
  return params;
}

// <Link to="/x">text</Link> — an anchor that navigates without a full reload.
export function Link({ to, children, ...rest }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        // Preserve normal behaviour for "open in new tab" gestures.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

// Declaratively redirect: render <Redirect to="/login" /> and it navigates in
// an effect (never during render — that would be a React side-effect bug).
export function Redirect({ to }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  return null;
}
