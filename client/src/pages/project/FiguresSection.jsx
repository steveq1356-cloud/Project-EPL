import { useState } from 'react';

function FigureEditor({ figure, onSave, onCancel, onRemove }) {
  const [f, setF] = useState(figure ?? { label: '', value: '', unit: '', note: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="figure figure-edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.label.trim() || f.value.trim()) onSave(f);
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <input value={f.label} onChange={set('label')} placeholder="Label — e.g. Peak stress" autoFocus aria-label="Label" />
      <div className="figure-edit-row">
        <input value={f.value} onChange={set('value')} placeholder="Value" aria-label="Value" />
        <input value={f.unit} onChange={set('unit')} placeholder="Unit" aria-label="Unit" className="unit" />
      </div>
      <input value={f.note} onChange={set('note')} placeholder="Note (optional)" aria-label="Note" />
      <div className="figure-edit-actions">
        {onRemove && (
          <button type="button" className="link-btn danger-text" onClick={onRemove}>
            Remove
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-small btn-primary">Save</button>
      </div>
    </form>
  );
}

// Your headline numbers. Click one to edit it.
export default function FiguresSection({ project, save }) {
  const [editing, setEditing] = useState(null); // index | 'new' | null
  const specs = project.specs ?? [];

  const saveSpecs = (next) => {
    setEditing(null);
    save({ specs: next });
  };

  return (
    <div className="figures">
      {specs.map((s, i) =>
        editing === i ? (
          <FigureEditor
            key={i}
            figure={s}
            onCancel={() => setEditing(null)}
            onSave={(f) => saveSpecs(specs.map((x, j) => (j === i ? f : x)))}
            onRemove={() => saveSpecs(specs.filter((_, j) => j !== i))}
          />
        ) : (
          <button key={i} className="figure" onClick={() => setEditing(i)} title={s.note || 'Click to edit'}>
            <span className="figure-label">{s.label}</span>
            <span className="figure-value">
              {s.value}
              {s.unit && <span className="figure-unit">{s.unit}</span>}
            </span>
            {s.note && <span className="figure-note">{s.note}</span>}
          </button>
        ),
      )}
      {editing === 'new' ? (
        <FigureEditor onCancel={() => setEditing(null)} onSave={(f) => saveSpecs([...specs, f])} />
      ) : (
        <button className="figure figure-add" onClick={() => setEditing('new')}>
          + Add a figure
        </button>
      )}
    </div>
  );
}
