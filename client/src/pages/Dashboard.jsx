import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import { formatDate } from '../format';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // An unfinished workout, if any — so "pick up where you left off" is one tap.
  const current = useApi(() => api.currentWorkout(), []);

  return (
    <div className="page">
      <h1>Hi, {user?.username}</h1>

      {current.data && (
        <Card>
          <p>You have an unfinished workout from {formatDate(current.data.date)}.</p>
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

      <p>
        <Link to="/routines">Your routines</Link>
        {' · '}
        <Link to="/exercises">Exercise library</Link>
        {' · '}
        <Link to="/settings">Settings</Link>
      </p>
    </div>
  );
}
