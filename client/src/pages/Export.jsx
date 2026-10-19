import { useAuth } from '../auth';
import ExportCard from '../components/ExportCard';

// Export data on its own page, reached from the Home dashboard. The same card
// also sits at the bottom of Settings.
export default function Export() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Export data</h1>
      <ExportCard user={user} />
    </div>
  );
}
