import './Button.css';

// A button that understands "an async action is running".
//
// Pass `pending` while a request is in flight. The button disables itself and
// shows a busy label — this is our primary defence against double-submits
// (user taps "Log set" twice before the first request returns).
export default function Button({
  pending = false,
  pendingLabel = 'Working…',
  variant = 'primary',
  className = '',
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`.trim()}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
