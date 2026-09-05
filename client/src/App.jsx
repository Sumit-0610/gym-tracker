import './styles/tokens.css';
import './styles/global.css';

import { AuthProvider, useAuth } from './auth';
import { Router, useRouter, matchPath, Redirect, Link } from './router';
import Nav from './components/Nav';
import Spinner from './components/Spinner';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Workout from './pages/Workout';
import History from './pages/History';
import WorkoutDetail from './pages/WorkoutDetail';

// The whole route table in one readable list.
//   public: true  -> reachable when logged out (login / signup)
//   everything else requires a session
const ROUTES = [
  { path: '/login', component: Login, public: true },
  { path: '/signup', component: Signup, public: true },
  { path: '/', component: Dashboard },
  { path: '/exercises', component: Exercises },
  { path: '/routines', component: Routines },
  { path: '/routines/:id', component: RoutineDetail },
  { path: '/workout', component: Workout },
  { path: '/workout/:id', component: Workout },
  { path: '/history', component: History },
  { path: '/history/:id', component: WorkoutDetail },
];

function NotFound() {
  return (
    <div className="page">
      <h1>Not found</h1>
      <p>
        No screen for this address. <Link to="/">Go home</Link>
      </p>
    </div>
  );
}

// Decides what to render for the current URL + auth state.
function Shell() {
  const { path } = useRouter();
  const { status } = useAuth();

  // Block the whole app until the initial GET /api/me resolves. Without this a
  // logged-in user would see a flash of the login page on every refresh.
  if (status === 'loading') return <Spinner full />;

  const authed = status === 'authenticated';

  let match = null;
  for (const route of ROUTES) {
    const params = matchPath(route.path, path);
    if (params) {
      match = { route, params };
      break;
    }
  }

  // Frontend route guarding is a UI convenience only. The backend is still the
  // real security boundary: it 401s every /api call that has no session.
  if (match) {
    if (!match.route.public && !authed) return <Redirect to="/login" />;
    if (match.route.public && authed) return <Redirect to="/" />;
  }

  const View = match ? match.route.component : NotFound;
  const params = match ? match.params : {};

  if (!authed) return <View {...params} />;

  return (
    <>
      <div className="with-nav">
        <View {...params} />
      </div>
      <Nav />
    </>
  );
}

export default function App() {
  // Router must wrap AuthProvider — AuthProvider calls useNavigate().
  return (
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>
  );
}
