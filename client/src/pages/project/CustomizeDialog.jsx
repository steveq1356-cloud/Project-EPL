import Modal from '../../components/Modal.jsx';
import { BUILTIN_SECTIONS, CUSTOM_KINDS } from '../../constants.js';

// Reorder, hide and add sections for one project page.
export default function CustomizeDialog({ layout, sections, onLayout, onAddCustom, onDeleteCustom, onClose }) {
  const custom = Object.fromEntries(sections.map((s) => [`custom:${s.id}`, s]));
  const label = (key) => BUILTIN_SECTIONS[key]?.label ?? custom[key]?.title ?? key;
  const hidden = Object.keys(BUILTIN_SECTIONS).filter((k) => !layout.includes(k));

  const move = (i, dir) => {
    const next = [...layout];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onLayout(next);
  };

  return (
    <Modal title="Customize this page" onClose={onClose}>
      <div className="customize">
        <p className="muted small">Hiding a built-in section keeps its data — show it again any time. Deleting a section you added removes its content.</p>

        <ol className="customize-list">
          {layout.map((key, i) => {
            const c = custom[key];
            return (
              <li key={key}>
                <span className="customize-icon" aria-hidden>
                  {c ? CUSTOM_KINDS[c.kind].icon : '▤'}
                </span>
                <span className="customize-name">
                  {label(key)}
                  <span className="muted small">{c ? CUSTOM_KINDS[c.kind].label : 'Built-in'}</span>
                </span>
                <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label(key)} up`}>
                  ↑
                </button>
                <button className="icon-btn" disabled={i === layout.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(key)} down`}>
                  ↓
                </button>
                {c ? (
                  <button className="link-btn danger-text" onClick={() => onDeleteCustom(c)}>
                    Delete
                  </button>
                ) : (
                  <button className="link-btn" onClick={() => onLayout(layout.filter((k) => k !== key))}>
                    Hide
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {hidden.length > 0 && (
          <>
            <h3 className="customize-heading">Hidden</h3>
            <div className="customize-chips">
              {hidden.map((key) => (
                <button key={key} className="chip" onClick={() => onLayout([...layout, key])} title={BUILTIN_SECTIONS[key].description}>
                  + {BUILTIN_SECTIONS[key].label}
                </button>
              ))}
            </div>
          </>
        )}

        <h3 className="customize-heading">Add your own</h3>
        <div className="kind-grid">
          {Object.entries(CUSTOM_KINDS).map(([kind, k]) => (
            <button key={kind} className="kind-card" onClick={() => onAddCustom(kind)}>
              <span className="kind-icon" aria-hidden>
                {k.icon}
              </span>
              <strong>{k.label}</strong>
              <span className="muted small">{k.description}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
