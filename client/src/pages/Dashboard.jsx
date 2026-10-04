import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import ActivityChart from '../components/ActivityChart';
import RecapCard from '../components/RecapCard';
import { Icon } from '../components/icons';
import './Dashboard.css';

const TILES = [
  ['/stats', 'Statistics', Icon.Stats],
  ['/exercises', 'Exercises', Icon.Dumbbell],
  ['/routines', 'Routines', Icon.List],
  ['/history', 'History', Icon.Clock],
  ['/calendar', 'Calendar', Icon.Calendar],
  ['/measures', 'Measures', Icon.Scale],
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unit = user?.weight_unit || 'kg';

  const current = useApi(() => api.currentWorkout(), []);
  const stats = useApi(() => api.stats(), []);
  const weekly = useApi(() => api.weeklyStats(12), []);

  // The AI recap of the latest finished workout (only when the user opted in
  // and the server has an AI key). Older recaps live on each workout in History.
  const aiOn = Boolean(user?.ai_enabled && user?.ai_available);
  const recent = useApi(
    () => (aiOn ? api.workouts({ limit: 10 }) : Promise.resolve([])),
    [aiOn],
  );
  const lastFinished = (recent.data ?? []).find(
    (w) => w.completed_at && w.set_count > 0,
  );

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
          <Icon.Settings />
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

      {lastFinished && (
        <RecapCard
          workoutId={lastFinished.id}
          title={`Coach’s recap · ${formatDate(lastFinished.date)}`}
        >
          <p className="recap-footer">
            <Link to={`/history/${lastFinished.id}`}>See this workout</Link>
            {' · '}
            Recaps for earlier workouts are on each workout in{' '}
            <Link to="/history">History</Link>.
          </p>
        </RecapCard>
      )}

      {weekly.loading && <Spinner label="Loading your activity…" />}
      {weekly.data && weekly.data.some((w) => w.sets > 0) && (
        <ActivityChart weeks={weekly.data} unit={unit} />
      )}

      <h2 className="dash-section">Dashboard</h2>
      <div className="dash-grid">
        {TILES.map(([to, label, TileIcon]) => (
          <Link key={to} to={to} className="dash-tile">
            <TileIcon />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
