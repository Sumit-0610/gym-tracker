import { Link, useRouter } from '../router';
import { useAuth } from '../auth';
import './Nav.css';

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/routines', label: 'Routines' },
  { to: '/history', label: 'History' },
];

// Fixed bottom tab bar — the standard mobile navigation pattern: thumb-reachable,
// always visible, shows where you are.
export default function Nav() {
  const { path } = useRouter();
  const { logout, user } = useAuth();

  return (
    <nav className="nav" aria-label="Main navigation">
      {TABS.map((t) => {
        // "/" is only active on exactly "/"; other tabs stay active on their
        // sub-routes too (/routines/3 keeps the Routines tab lit).
        const active =
          t.to === '/' ? path === '/' : path === t.to || path.startsWith(`${t.to}/`);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={active ? 'nav-item nav-item-active' : 'nav-item'}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
      <button
        type="button"
        className="nav-item nav-logout"
        onClick={logout}
        aria-label={`Log out ${user?.username ?? ''}`}
      >
        Log out
      </button>
    </nav>
  );
}
