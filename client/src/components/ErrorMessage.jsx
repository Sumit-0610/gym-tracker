import { describeError } from '../format';
import './ErrorMessage.css';

// Page-level failure banner. The status→sentence mapping lives in
// describeError (shared with the auth screens) so wording stays consistent.
export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-box" role="alert">
      <p>{describeError(error)}</p>
      {onRetry && (
        <button type="button" className="error-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
