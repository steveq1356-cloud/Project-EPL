import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Native <dialog>: focus trapping, Esc to close and the backdrop come for free.
export default function Modal({ title, onClose, children, wide = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    // showModal() focuses the first focusable element (the ✕); start in the form instead.
    dialog.querySelector('.modal-body form input, .modal-body form select, .modal-body form textarea')?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
