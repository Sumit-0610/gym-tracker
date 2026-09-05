import WorkoutStart from './WorkoutStart';
import WorkoutSession from './WorkoutSession';

// Routed at BOTH /workout and /workout/:id (see the route table in App.jsx).
//   /workout       -> choose routine or freestyle, then start
//   /workout/:id   -> the active session: log sets, see logged sets
//
// Putting the id in the URL means a mid-workout refresh reloads the session
// from GET /api/workouts/:id (an endpoint that already exists) instead of
// losing it.
export default function Workout({ id }) {
  return id ? <WorkoutSession id={id} /> : <WorkoutStart />;
}
