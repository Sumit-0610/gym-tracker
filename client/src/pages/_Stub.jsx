import Card from '../components/Card';

// Temporary placeholder used by screens not yet built in this milestone.
// Each is replaced by its real implementation in a later 11x commit.
export default function Stub({ title, milestone }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <Card>
        <p>Coming in milestone {milestone}.</p>
      </Card>
    </div>
  );
}
