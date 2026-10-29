import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

// Full-size photo viewer; ← / → step through the list.
export default function Lightbox({ photos, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length]);

  if (!photo) return null;

  return (
    <Modal title={photo.caption || photo.original_name} onClose={onClose} wide>
      <div className="lightbox">
        <img src={photo.url} alt={photo.caption || photo.original_name} />
        <div className="lightbox-bar">
          <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Prev
          </button>
          <span className="muted mono">
            {index + 1} / {photos.length} · {photo.taken_on} · {photo.width}×{photo.height}
          </span>
          <a className="btn" href={photo.url} target="_blank" rel="noreferrer">
            Open original
          </a>
          <button className="btn" disabled={index === photos.length - 1} onClick={() => setIndex(index + 1)}>
            Next →
          </button>
        </div>
      </div>
    </Modal>
  );
}
