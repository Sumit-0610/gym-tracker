import './Spinner.css';

// `full` centres it in the viewport — used for the initial auth check and
// route transitions. Otherwise it's an inline chunk for a loading section.
export default function Spinner({ full = false, label = 'Loading…' }) {
  return (
    <div className={full ? 'spinner-wrap spinner-full' : 'spinner-wrap'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
