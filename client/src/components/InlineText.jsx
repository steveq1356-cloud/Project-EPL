import { useEffect, useRef, useState } from 'react';

// Shows text; click (or Enter when focused) to edit. Saves on blur or Enter
// (Ctrl+Enter when multiline). Esc cancels.
export default function InlineText({ value, onSave, placeholder = 'Click to add…', multiline = false, required = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const next = multiline ? draft : draft.trim();
    setEditing(false);
    if (required && !next) return setDraft(value);
    if (next !== value) onSave(next);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setDraft(value);
      setEditing(false);
    } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commit();
    }
  }

  if (editing) {
    const props = {
      ref: inputRef,
      className: `inline-input ${className}`,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown,
      placeholder,
    };
    return multiline ? <textarea rows={Math.max(3, draft.split('\n').length + 1)} {...props} /> : <input {...props} />;
  }

  return (
    <span
      className={`inline-text ${multiline ? 'multiline' : ''} ${value ? '' : 'empty'} ${className}`}
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
    >
      {value || placeholder}
    </span>
  );
}
