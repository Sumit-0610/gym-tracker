import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ActivityChart from '../components/ActivityChart';
import './Dashboard.css';

const TILES = [
  [
    '/stats',
    'Statistics',
    'M3 13h3v6H3v-6Zm5-6h3v12H8V7Zm5 3h3v9h-3v-9Zm5-6h3v15h-3V4Z',
  ],
  [
    '/exercises',
    'Exercises',
    'M5 9h1V7H4v2H2v2h2v2h2v-2h1V9Zm14 0h-1V7h2v2h2v2h-2v2h-2v-2h-1V9Zm-9 1h6v2H10v-2Z',
  ],
  ['/routines', 'Routines', 'M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z'],
  [
    '/history',
    'History',
    'M13 3a9 9 0 1 0 8.5 12h-2.1A7 7 0 1 1 13 5v5l4 2 .8-1.6L14 8.6V3h-1Z',
  ],
  [
    '/calendar',
    'Calendar',
    'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7ZM5 9h14v10H5V9Z',
  ],
  [
    '/measures',
    'Measures',
    'M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-1 9h2l3 4v7h-2v-6l-2-2-2 2v6H8v-7l3-4Z',
  ],
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unit = user?.weight_unit || 'kg';

  const current = useApi(() => api.currentWorkout(), []);
  const stats = useApi(() => api.stats(), []);
  const weekly = useApi(() => api.weeklyStats(12), []);

  const s = stats.data;

  return (
    <div className="page dashboard">
      <header className="dash-head">
        <div>
          <h1>{user?.username}</h1>
          {s && (
            <p className="dash-meta">
              <strong>{s.workout_count}</strong>{' '}
              {s.workout_count === 1 ? 'workout' : 'workouts'}
              {s.week_streak > 0 && (
                <>
                  {' · '}
                  <span className="dash-streak">
                    🔥 {s.week_streak}-week streak
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        <Link to="/settings" className="dash-gear" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.9 4c0 .6-.1 1.2-.2 1.7l2 1.6-2 3.4-2.4-1a7.7 7.7 0 0 1-3 1.7L13 22h-2l-.3-2.6a7.7 7.7 0 0 1-3-1.7l-2.4 1-2-3.4 2-1.6a7.6 7.6 0 0 1 0-3.4l-2-1.6 2-3.4 2.4 1a7.7 7.7 0 0 1 3-1.7L11 2h2l.3 2.6c1.1.3 2.1.9 3 1.7l2.4-1 2 3.4-2 1.6c.2.5.2 1.1.2 1.7Z"
            />
          </svg>
        </Link>
      </header>

      {current.data && (
        <Card>
          <p>
            You have an unfinished workout from {formatDate(current.data.date)}.
          </p>
          <Button
            className="btn-block"
            onClick={() => navigate(`/workout/${current.data.id}`)}
          >
            Resume workout
          </Button>
        </Card>
      )}

      <Card>
        <Button
          className="btn-block"
          variant={current.data ? 'secondary' : 'primary'}
          onClick={() => navigate('/workout')}
        >
          {current.data ? 'Start a new workout' : 'Start a workout'}
        </Button>
      </Card>

      {weekly.loading && <Spinner label="Loading your activity…" />}
      {weekly.data && weekly.data.some((w) => w.sets > 0) && (
        <ActivityChart weeks={weekly.data} unit={unit} />
      )}

      <h2 className="dash-section">Dashboard</h2>
      <div className="dash-grid">
        {TILES.map(([to, label, path]) => (
          <Link key={to} to={to} className="dash-tile">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="currentColor" d={path} />
            </svg>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
