import './styles/tokens.css';
import './styles/global.css';

import { AuthProvider, useAuth } from './auth';
import { Router, useRouter, matchPath, Redirect, Link } from './router';
import Nav from './components/Nav';
import Spinner from './components/Spinner';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import ExerciseProgress from './pages/ExerciseProgress';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Plans from './pages/Plans';
import PlanDetail from './pages/PlanDetail';
import Workout from './pages/Workout';
import History from './pages/History';
import WorkoutDetail from './pages/WorkoutDetail';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Calendar from './pages/Calendar';
import Measures from './pages/Measures';
import VerifyEmail from './pages/VerifyEmail';
import Admin from './pages/Admin';

// The whole route table in one readable list.
//   public: true  -> reachable when logged out (login / signup)
//   anyone: true  -> reachable signed in or not (a reset link from an email)
//   everything else requires a session
const ROUTES = [
  { path: '/login', component: Login, public: true },
  { path: '/signup', component: Signup, public: true },
  { path: '/forgot-password', component: ForgotPassword, public: true },
  { path: '/reset-password', component: ResetPassword, anyone: true },
  { path: '/verify-email', component: VerifyEmail, anyone: true },
  { path: '/admin', component: Admin },
  { path: '/', component: Dashboard },
  { path: '/exercises', component: Exercises },
  { path: '/exercises/:id', component: ExerciseProgress },
  { path: '/routines', component: Routines },
  // Before /routines/:id, so "plans" is not read as a routine id. Living under
  // /routines keeps the Routines tab lit.
  { path: '/routines/plans', component: Plans },
  { path: '/routines/plans/:id', component: PlanDetail },
  { path: '/routines/:id', component: RoutineDetail },
  { path: '/workout', component: Workout },
  { path: '/workout/:id', component: Workout },
  { path: '/history', component: History },
  { path: '/history/:id', component: WorkoutDetail },
  { path: '/settings', component: Settings },
  { path: '/stats', component: Stats },
  { path: '/calendar', component: Calendar },
  { path: '/measures', component: Measures },
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
  if (match && !match.route.anyone) {
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
