import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

// Full-size photo viewer; ← / → step through the list. `details(photo)` can render
// editing controls beside the image.
export default function Lightbox({ photos, startIndex = 0, onClose, details }) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[Math.min(index, photos.length - 1)];

  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length]);

  useEffect(() => {
    if (!photos.length) onClose();
  }, [photos.length]);

  if (!photo) return null;

  return (
    <Modal title={photo.caption || photo.original_name} onClose={onClose} wide>
      <div className={`lightbox ${details ? 'with-details' : ''}`}>
        <div className="lightbox-image">
          <img src={photo.url} alt={photo.caption || photo.original_name} />
        </div>
        {details && <aside className="lightbox-details">{details(photo)}</aside>}
      </div>
      <div className="lightbox-bar">
        <button className="btn btn-small" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Prev
        </button>
        <span className="muted small">
          {index + 1} / {photos.length} · {photo.width}×{photo.height}
        </span>
        <span className="lightbox-bar-right">
          <a className="link-btn" href={photo.url} target="_blank" rel="noreferrer">
            Original
          </a>
          <button className="btn btn-small" disabled={index === photos.length - 1} onClick={() => setIndex(index + 1)}>
            Next →
          </button>
        </span>
      </div>
    </Modal>
  );
}
