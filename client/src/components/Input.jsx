import { useId } from 'react';
import './Input.css';

// A labelled input.
//
// The <label htmlFor={id}> tied to <input id={id}> is the single biggest
// accessibility win in any form: screen readers announce the label with the
// field, and tapping the label text focuses the input (a bigger touch target).
export default function Input({ label, error, hint, ...rest }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
