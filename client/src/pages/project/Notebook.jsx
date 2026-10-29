import { useState } from 'react';
import { api } from '../../api/index.js';
import { LOG_TYPES } from '../../constants.js';
import Lightbox from '../../components/Lightbox.jsx';
import LogEntryForm from '../../components/LogEntryForm.jsx';
import Markdown from '../../components/Markdown.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { formatDateTime } from '../../utils/dates.js';

const byNewest = (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id;
const COLLAPSED_COUNT = 6;

export default function Notebook({ projectId, entries, setEntries, onChanged, initialExpanded = false }) {
  const { deleteWithUndo } = useToasts();
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { photos, index }
  const [expanded, setExpanded] = useState(initialExpanded);

  const upsert = (entry) => setEntries((list) => [entry, ...list.filter((e) => e.id !== entry.id)].sort(byNewest));

  function remove(entry) {
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    deleteWithUndo(`Deleted “${entry.title}”`, {
      commit: async () => {
        await api.log.remove(entry.id);
        onChanged();
      },
      undo: () => upsert(entry),
    });
  }

  const counts = Object.fromEntries(LOG_TYPES.map((t) => [t, entries.filter((e) => e.type === t).length]));
  const filtered = filter === 'All' ? entries : entries.filter((e) => e.type === filter);
  const shown = expanded || filter !== 'All' ? filtered : filtered.slice(0, COLLAPSED_COUNT);

  return (
    <section id="notebook" className="notebook card">
      <header className="panel-head">
        <h2>
          <span className="section-num">02</span> Notebook
        </h2>
        <span className="muted small">{entries.length} entries</span>
      </header>

      <LogEntryForm
        projectId={projectId}
        onSaved={(entry) => {
          upsert(entry);
          onChanged();
        }}
      />

      {entries.length > 0 && (
        <div className="filter-chips" role="group" aria-label="Filter by type">
          {['All', ...LOG_TYPES].map((t) =>
            t === 'All' || counts[t] ? (
              <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                {t !== 'All' && <span className={`type-dot log-type-${t.toLowerCase()}`} />}
                {t} <span className="muted">{t === 'All' ? entries.length : counts[t]}</span>
              </button>
            ) : null,
          )}
        </div>
      )}

      {entries.length === 0 && <p className="muted empty-state">No log entries yet. Write the first one above — paste a photo straight in.</p>}

      <ol className="log-list">
        {shown.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} id={`log-${entry.id}`} className="log-entry editing">
              <LogEntryForm
                projectId={projectId}
                entry={entry}
                autoFocus
                onCancel={() => setEditingId(null)}
                onSaved={(saved) => {
                  upsert(saved);
                  setEditingId(null);
                  onChanged();
                }}
              />
            </li>
          ) : (
            <li key={entry.id} id={`log-${entry.id}`} className={`log-entry type-${entry.type.toLowerCase()}`}>
              <div className="log-rail" aria-hidden>
                <span className={`log-node log-type-${entry.type.toLowerCase()}`} />
              </div>
              <div className="log-content">
                <header className="log-entry-header">
                  <span className={`log-type log-type-${entry.type.toLowerCase()}`}>{entry.type}</span>
                  <h3>{entry.title}</h3>
                  <time className="muted mono small" dateTime={entry.timestamp}>
                    {formatDateTime(entry.timestamp)}
                  </time>
                  <div className="log-entry-actions">
                    <button className="btn btn-small btn-ghost" onClick={() => setEditingId(entry.id)}>
                      Edit
                    </button>
                    <button className="btn btn-small btn-ghost danger-text" onClick={() => remove(entry)}>
                      Delete
                    </button>
                  </div>
                </header>
                {entry.body.trim() && <Markdown>{entry.body}</Markdown>}
                {entry.photos.length > 0 && (
                  <div className="thumb-row">
                    {entry.photos.map((p, i) => (
                      <button key={p.id} className="thumb" onClick={() => setLightbox({ photos: entry.photos, index: i })} title={p.caption || p.original_name}>
                        <img src={p.thumb_url} alt={p.caption || p.original_name} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ol>

      {filter === 'All' && filtered.length > COLLAPSED_COUNT && (
        <button className="btn show-more" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show fewer' : `Show all ${filtered.length} entries`}
        </button>
      )}

      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </section>
  );
}
