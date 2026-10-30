import { useState } from 'react';
import Modal from './Modal.jsx';

// "Are you sure?" with an optional type-to-confirm word for destructive actions.
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', typeToConfirm, danger = true, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = !typeToConfirm || typed.trim() === typeToConfirm;

  async function confirm(e) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={confirm}>
        <p className="confirm-message">{message}</p>
        {typeToConfirm && (
          <label>
            <span>
              Type <strong>{typeToConfirm}</strong> to confirm
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        )}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} disabled={!ok || busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
