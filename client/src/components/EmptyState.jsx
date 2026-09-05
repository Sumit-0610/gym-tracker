import './EmptyState.css';

// Shown when a request succeeds but returns nothing (no routines yet, etc.).
// A blank screen leaves the user wondering if it's broken or loading; this
// tells them the screen works and there's simply nothing here — plus the next
// action to take.
export default function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-body">{children}</p>}
      {action}
    </div>
  );
}
