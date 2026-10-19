import { useEffect, useRef } from 'react';
import { Icon } from './icons';
import { ExportForm } from './ExportCard';
import './ExportModal.css';

// The export form in a modal, opened from the export icon on Home.
//
// Built on the native <dialog> element: showModal() gives the backdrop, keeps
// Tab inside, closes on Escape and hands focus back to the opener for free.
export default function ExportModal({ user, onClose }) {
  const ref = useRef(null);

  // Open once mounted. No close() on cleanup: unmounting removes the element
  // (and its backdrop) anyway, and a close() there would fire onClose again.
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="export-modal"
      aria-labelledby="export-modal-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not its content.
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <div className="export-modal-card">
        <header className="export-modal-head">
          <span className="export-modal-icon" aria-hidden="true">
            <Icon.Download />
          </span>
          <div>
            <h2 id="export-modal-title">Export your data</h2>
            <p className="export-modal-benefit">
              Keep a backup of your training, dig into it in a spreadsheet, or
              share it with a coach.
            </p>
          </div>
          <button
            type="button"
            className="export-modal-close"
            aria-label="Close"
            onClick={() => ref.current?.close()}
          >
            ×
          </button>
        </header>
        <ExportForm user={user} />
      </div>
    </dialog>
  );
}
