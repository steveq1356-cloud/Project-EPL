import { useEffect, useId, useState } from 'react';
import { api } from '../api/index.js';

// Tag chips with remove buttons; type and press Enter or comma to add.
export default function TagEditor({ tags, onSave }) {
  const [draft, setDraft] = useState('');
  const [known, setKnown] = useState([]);
  const listId = useId();

  useEffect(() => {
    api.projects.tags().then(setKnown).catch(() => {});
  }, []);

  // Adds every comma-separated piece of `text`; with keepLast, the text after the last comma stays as the draft.
  function add(text = draft, { keepLast = false } = {}) {
    const parts = text.split(',');
    const rest = keepLast ? parts.pop() : '';
    setDraft(rest);
    const next = [...tags];
    for (const part of parts) {
      const tag = part.trim();
      if (tag && !next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== tags.length) onSave(next);
  }

  return (
    <div className="tags">
      {tags.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <button className="tag-remove" aria-label={`Remove tag ${tag}`} onClick={() => onSave(tags.filter((t) => t !== tag))}>
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-input"
        list={listId}
        value={draft}
        placeholder={tags.length ? '+ tag' : 'Add tags…'}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value, { keepLast: true }) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onSave(tags.slice(0, -1));
          }
        }}
        onBlur={() => add()}
      />
      <datalist id={listId}>
        {known.filter((t) => !tags.includes(t)).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}
