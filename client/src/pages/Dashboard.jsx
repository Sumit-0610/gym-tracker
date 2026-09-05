import { useAuth } from '../auth';
import { Link } from '../router';
import Card from '../components/Card';

// Placeholder for milestone 11a — becomes the real dashboard (routines +
// recent workouts + quick start) in 11c once those endpoints have UI.
export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Hi, {user?.username}</h1>
      <Card>
        <p>Your dashboard will show routines and recent workouts here.</p>
      </Card>
      <p>
        <Link to="/exercises">Browse the exercise library →</Link>
      </p>
    </div>
  );
}
