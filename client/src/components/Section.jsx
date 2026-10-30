import { useState } from 'react';
import Menu from './Menu.jsx';

// The frame every project-page section sits in: an icon, title and count, quiet
// actions, and a ⋯ menu for moving / hiding / deleting — above one card of content.
export default function Section({ id, title, icon: Icon, count, actions, controls, children, bare = false, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);

  return (
    <section id={id} className="section">
      <header className="section-header">
        {Icon && (
          <span className="section-icon" aria-hidden>
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onRename(draft.trim());
              setRenaming(false);
            }}
          >
            <input className="section-rename" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setRenaming(false)} autoFocus />
          </form>
        ) : (
          <h2 onDoubleClick={() => onRename && setRenaming(true)} title={onRename ? 'Double-click to rename' : undefined}>
            {title}
          </h2>
        )}
        {count != null && <span className="section-count">{count}</span>}
        <div className="section-actions">
          {actions}
          {controls && (
            <Menu
              title={`${title} options`}
              items={[
                onRename && { label: 'Rename', onClick: () => { setDraft(title); setRenaming(true); } },
                { label: 'Move up', onClick: controls.up, disabled: !controls.up },
                { label: 'Move down', onClick: controls.down, disabled: !controls.down },
                'divider',
                controls.hide && { label: 'Hide section', onClick: controls.hide },
                controls.remove && { label: 'Delete section', onClick: controls.remove, danger: true },
              ]}
            />
          )}
        </div>
      </header>
      {bare ? children : <div className="section-body">{children}</div>}
    </section>
  );
}
