import { useState } from 'react';
import { Meter } from '../../components/charts/Charts.jsx';
import { money, plural } from '../../utils/format.js';

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
      <input value={f.label} onChange={set('label')} placeholder="Label (e.g. Peak stress)" autoFocus aria-label="Label" />
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
        <button type="button" className="link-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-small btn-primary">Save</button>
      </div>
    </form>
  );
}

// The project's headline numbers: your own key figures plus live counts.
export default function KeyFigures({ project, stats, save }) {
  const [editing, setEditing] = useState(null); // index, 'new', or null
  const specs = project.specs ?? [];
  const tasksTotal = (stats?.open_tasks ?? 0) + (stats?.done_tasks ?? 0);

  const saveSpecs = (next) => {
    setEditing(null);
    save({ specs: next });
  };

  return (
    <section className="figures" aria-label="Key figures">
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
          <button key={i} className="figure" onClick={() => setEditing(i)} title="Click to edit">
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
          + Key figure
          <span className="figure-note">Design load, tolerance, cost/unit…</span>
        </button>
      )}

      <div className="figure computed">
        <span className="figure-label">Spent{project.budget_cents ? ' vs budget' : ''}</span>
        <span className="figure-value">{money(stats?.spent_cents ?? 0, { whole: (stats?.spent_cents ?? 0) >= 100000 })}</span>
        {project.budget_cents ? (
          <>
            <Meter value={stats?.spent_cents ?? 0} max={project.budget_cents} label="Spent of budget" />
            <span className="figure-note">
              {Math.round(((stats?.spent_cents ?? 0) / project.budget_cents) * 100)}% of {money(project.budget_cents, { whole: true })}
              {stats?.planned_cents ? ` · ${money(stats.planned_cents, { whole: true })} planned` : ''}
            </span>
          </>
        ) : (
          <span className="figure-note">{stats?.planned_cents ? `${money(stats.planned_cents)} planned` : 'Set a budget in the title block'}</span>
        )}
      </div>
      <div className="figure computed">
        <span className="figure-label">Tasks</span>
        <span className="figure-value">
          {stats?.done_tasks ?? 0}
          <span className="figure-unit">/ {tasksTotal}</span>
        </span>
        {tasksTotal > 0 && <Meter value={stats.done_tasks} max={tasksTotal} warnAt={2} label="Tasks done" />}
        <span className="figure-note">{stats?.overdue_tasks ? `${stats.overdue_tasks} overdue` : `${stats?.open_tasks ?? 0} open`}</span>
      </div>
      <a className="figure computed" href="#notebook">
        <span className="figure-label">Notebook</span>
        <span className="figure-value">{stats?.entry_count ?? 0}</span>
        <span className="figure-note">
          {plural(stats?.photo_count ?? 0, 'photo')} · {plural(stats?.link_count ?? 0, 'link')}
        </span>
      </a>
    </section>
  );
}
