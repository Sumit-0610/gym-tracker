import { useAuth } from '../auth';
import { useNavigate, Link } from '../router';
import Card from '../components/Card';
import Button from '../components/Button';

// A full recent-workouts dashboard comes with history (11e). For now this is
// the entry point to the core loop: start a workout.
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page">
      <h1>Hi, {user?.username}</h1>

      <Card>
        <Button className="btn-block" onClick={() => navigate('/workout')}>
          Start a workout
        </Button>
      </Card>

      <p>
        <Link to="/routines">Your routines</Link>
        {' · '}
        <Link to="/exercises">Exercise library</Link>
      </p>
    </div>
  );
}
