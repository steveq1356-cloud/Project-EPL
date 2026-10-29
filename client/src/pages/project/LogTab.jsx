import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { LOG_TYPES } from '../../constants.js';
import Lightbox from '../../components/Lightbox.jsx';
import LogEntryForm from '../../components/LogEntryForm.jsx';
import Markdown from '../../components/Markdown.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { formatDateTime } from '../../utils/dates.js';

const byNewest = (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id;

export default function LogTab({ project }) {
  const { deleteWithUndo } = useToasts();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { photos, index }

  useEffect(() => {
    api.log.list(project.id).then(setEntries).catch((e) => setError(e.message));
  }, [project.id]);

  const upsert = (entry) => setEntries((list) => [entry, ...list.filter((e) => e.id !== entry.id)].sort(byNewest));

  function remove(entry) {
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    deleteWithUndo(`Deleted “${entry.title}”`, {
      commit: () => api.log.remove(entry.id),
      undo: () => upsert(entry),
    });
  }

  if (error) return <p className="error">{error}</p>;
  if (!entries) return <p className="muted">Loading…</p>;

  const counts = Object.fromEntries(LOG_TYPES.map((t) => [t, entries.filter((e) => e.type === t).length]));
  const shown = filter === 'All' ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="log-tab">
      <LogEntryForm projectId={project.id} onSaved={upsert} />

      {entries.length > 0 && (
        <div className="filter-chips" role="group" aria-label="Filter by type">
          {['All', ...LOG_TYPES].map((t) =>
            t === 'All' || counts[t] ? (
              <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                {t} <span className="muted">{t === 'All' ? entries.length : counts[t]}</span>
              </button>
            ) : null,
          )}
        </div>
      )}

      {entries.length === 0 && <p className="muted empty-state">No log entries yet. Write the first one above.</p>}

      <ol className="log-list">
        {shown.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="log-entry editing">
              <LogEntryForm
                projectId={project.id}
                entry={entry}
                autoFocus
                onCancel={() => setEditingId(null)}
                onSaved={(saved) => {
                  upsert(saved);
                  setEditingId(null);
                }}
              />
            </li>
          ) : (
            <li key={entry.id} className="log-entry">
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
            </li>
          ),
        )}
      </ol>

      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
