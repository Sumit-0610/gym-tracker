import './ErrorMessage.css';

// Turns an ApiError into a human sentence.
//
// It branches on the HTTP status CODE, never on the message string. Codes are
// the stable contract between frontend and backend (see the API table in the
// README); wording can change without breaking this.
function toMessage(error) {
  switch (error?.status) {
    case 0:
      return 'Cannot reach the server. Check your connection and try again.';
    case 400:
      return error.message || 'That request was not valid.';
    case 401:
      return 'Your session has ended. Please log in again.';
    case 404:
      return 'This item no longer exists, or you do not have access to it.';
    case 409:
      return error.message || 'That already exists.';
    case 500:
      return 'Something went wrong on the server. Please try again.';
    default:
      return error?.message || 'An unexpected error occurred.';
  }
}

export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-box" role="alert">
      <p>{toMessage(error)}</p>
      {onRetry && (
        <button type="button" className="error-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
