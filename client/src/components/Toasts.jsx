import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);
const UNDO_MS = 6000;

// Toasts plus "delete with undo": the item disappears right away, but the real
// delete only runs after a few seconds unless Undo is clicked.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const pending = useRef(new Map()); // id -> commit function

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message, { error = false } = {}) => {
      const id = crypto.randomUUID();
      setToasts((list) => [...list, { id, message, error }]);
      setTimeout(() => dismiss(id), error ? 8000 : 3000);
    },
    [dismiss],
  );

  const deleteWithUndo = useCallback(
    (message, { commit, undo }) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(run, UNDO_MS);
      function run() {
        clearTimeout(timer);
        if (!pending.current.delete(id)) return;
        dismiss(id);
        Promise.resolve(commit()).catch((e) => {
          undo();
          notify(`Delete failed: ${e.message}`, { error: true });
        });
      }
      pending.current.set(id, run);
      setToasts((list) => [
        ...list,
        {
          id,
          message,
          action: {
            label: 'Undo',
            onClick: () => {
              clearTimeout(timer);
              pending.current.delete(id);
              dismiss(id);
              undo();
            },
          },
        },
      ]);
    },
    [dismiss, notify],
  );

  // If the tab closes, carry out any deletes still waiting on their undo window.
  useEffect(() => {
    const flush = () => [...pending.current.values()].forEach((run) => run());
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return (
    <ToastContext.Provider value={{ notify, deleteWithUndo }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.error ? 'toast-error' : ''}`}>
            <span>{t.message}</span>
            {t.action && (
              <button className="btn btn-small" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToasts = () => useContext(ToastContext);
