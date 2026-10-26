import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import './ImageViewer.css';

// Tap an exercise photo to see it big.
//
// <ZoomableImage> is the small photo, wrapped in a button. Tapping it opens
// <ImageViewer>, a full-screen pop-up built on the native <dialog> element
// (like ExportModal): showModal() gives the dark backdrop, keeps keyboard
// focus inside, closes on Escape and returns focus to the photo afterwards.
//
// Ways to close: the × button, Escape, a tap outside the photo, or the
// phone's Back button. For Back to work we add one history entry when the
// viewer opens; Back removes it and we close. Closing any other way removes
// that entry ourselves, so Back then still goes to the previous page.

const HISTORY_KEY = 'imageViewer';

export function ImageViewer({ src, alt, caption, onClose }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();

    // Guarded so React's dev double-run doesn't add two entries.
    if (!window.history.state?.[HISTORY_KEY]) {
      window.history.pushState({ [HISTORY_KEY]: true }, '');
    }
    // Back pressed: the browser already removed our entry, just close.
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Closed by ×, Escape or the backdrop: take our history entry back off.
  function handleClose() {
    if (window.history.state?.[HISTORY_KEY]) window.history.back();
    onCloseRef.current();
  }

  return (
    <dialog
      ref={ref}
      className="image-viewer"
      aria-label={alt}
      onClose={handleClose}
      // A tap anywhere that isn't the photo itself closes the viewer.
      onClick={(e) => e.target.tagName !== 'IMG' && ref.current?.close()}
    >
      <button
        type="button"
        className="image-viewer-close"
        aria-label="Close photo"
        autoFocus
        onClick={() => ref.current?.close()}
      >
        ×
      </button>
      <figure className="image-viewer-figure">
        <img src={src} alt={alt} />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </dialog>
  );
}

// The small, tappable photo. `className` styles the <img> exactly as before;
// `buttonClassName` lets a page size the wrapper (e.g. full width).
export function ZoomableImage({
  src,
  name,
  className,
  buttonClassName = '',
  imgAlt = '',
  loading,
}) {
  const [open, setOpen] = useState(false);
  const bigAlt = `${name}: start and finish position`;

  return (
    <>
      <button
        type="button"
        className={`zoomable ${buttonClassName}`.trim()}
        aria-label={`Enlarge photo of ${name}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <img
          className={className}
          src={src}
          alt={imgAlt}
          loading={loading}
          decoding="async"
        />
        <span className="zoomable-hint" aria-hidden="true">
          <Icon.Expand />
        </span>
      </button>
      {open && (
        <ImageViewer
          src={src}
          alt={bigAlt}
          caption={`${name} · start → finish`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
