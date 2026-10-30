import { ArrowDown, ArrowUp, EyeOff, Plus, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { BUILTIN_SECTIONS, CUSTOM_KINDS } from '../../constants.js';

// Reorder, hide and add sections for one project page.
export default function CustomizeDialog({ layout, sections, onLayout, onAddCustom, onDeleteCustom, onClose }) {
  const custom = Object.fromEntries(sections.map((s) => [`custom:${s.id}`, s]));
  const info = (key) => (custom[key] ? { label: custom[key].title, kind: CUSTOM_KINDS[custom[key].kind].label, icon: CUSTOM_KINDS[custom[key].kind].icon } : { label: BUILTIN_SECTIONS[key].label, kind: 'Built-in', icon: BUILTIN_SECTIONS[key].icon });
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
            const { label, kind, icon: Icon } = info(key);
            const c = custom[key];
            return (
              <li key={key}>
                <span className="section-icon" aria-hidden>
                  <Icon size={14} />
                </span>
                <span className="customize-name">
                  {label}
                  <span className="muted small">{kind}</span>
                </span>
                <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label} up`} title="Move up">
                  <ArrowUp size={15} />
                </button>
                <button className="icon-btn" disabled={i === layout.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label} down`} title="Move down">
                  <ArrowDown size={15} />
                </button>
                {c ? (
                  <button className="icon-btn danger-hover" onClick={() => onDeleteCustom(c)} aria-label={`Delete ${label}`} title="Delete section">
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button className="icon-btn" onClick={() => onLayout(layout.filter((k) => k !== key))} aria-label={`Hide ${label}`} title="Hide section">
                    <EyeOff size={15} />
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
              {hidden.map((key) => {
                const Icon = BUILTIN_SECTIONS[key].icon;
                return (
                  <button key={key} className="chip dashed" onClick={() => onLayout([...layout, key])} title={BUILTIN_SECTIONS[key].description}>
                    <Plus size={13} aria-hidden /> <Icon size={13} aria-hidden /> {BUILTIN_SECTIONS[key].label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <h3 className="customize-heading">Add your own</h3>
        <div className="kind-grid">
          {Object.entries(CUSTOM_KINDS).map(([kind, k]) => (
            <button key={kind} className="kind-card" onClick={() => onAddCustom(kind)}>
              <span className="kind-icon" aria-hidden>
                <k.icon size={18} />
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
