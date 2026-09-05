import { useId } from 'react';
import './Select.css';

// A labelled native <select>. Native is the right call on mobile: the OS shows
// its own scrollable picker, which beats anything we'd build. `children` are the
// <option> / <optgroup> elements.
export default function Select({ label, error, children, ...rest }) {
  const id = useId();
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="select-wrap">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          {...rest}
        >
          {children}
        </select>
        <span className="select-arrow" aria-hidden="true">▾</span>
      </div>
      {error && (
        <span id={errId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
