import { NotebookPen, PenLine } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import EmptyState from '../../components/EmptyState.jsx';
import { LOG_TYPES } from '../../constants.js';
import { celebrate } from '../../utils/celebrate.js';
import Lightbox from '../../components/Lightbox.jsx';
import LogEntryForm from '../../components/LogEntryForm.jsx';
import Markdown from '../../components/Markdown.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { formatDateTime } from '../../utils/dates.js';

const byNewest = (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id;
const COLLAPSED_COUNT = 5;

export default function Notebook({ projectId, entries, setEntries, onChanged, initialExpanded = false }) {
  const { deleteWithUndo } = useToasts();
  const [composing, setComposing] = useState(false);
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

  const types = LOG_TYPES.filter((t) => entries.some((e) => e.type === t));
  const filtered = filter === 'All' ? entries : entries.filter((e) => e.type === filter);
  const shown = expanded || filter !== 'All' ? filtered : filtered.slice(0, COLLAPSED_COUNT);

  return (
    <div className="notebook">
      {composing ? (
        <LogEntryForm
          projectId={projectId}
          autoFocus
          onCancel={() => setComposing(false)}
          onSaved={(entry) => {
            upsert(entry);
            setComposing(false);
            onChanged();
            if (entry.type === 'Milestone') celebrate();
          }}
        />
      ) : (
        <button className="composer-stub" onClick={() => setComposing(true)}>
          <PenLine size={16} aria-hidden />
          <span>What did you work on?</span>
          <kbd>N</kbd>
        </button>
      )}

      {types.length > 1 && (
        <div className="filter-tabs" role="group" aria-label="Filter by type">
          {['All', ...types].map((t) => (
            <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>
              {t !== 'All' && <span className={`type-dot log-type-${t.toLowerCase()}`} />}
              {t}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 && !composing && (
        <EmptyState icon={NotebookPen} title="Your notebook is empty">
          Log decisions, tests and problems as you go — paste photos straight into an entry.
        </EmptyState>
      )}

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
            <li key={entry.id} id={`log-${entry.id}`} className="log-entry">
              <header className="log-entry-header">
                <span className={`type-tag log-type-${entry.type.toLowerCase()}`}>
                  <span className="type-dot" />
                  {entry.type}
                </span>
                <h3>{entry.title}</h3>
                <span className="spacer" />
                <span className="log-entry-actions">
                  <button className="link-btn" onClick={() => setEditingId(entry.id)}>
                    Edit
                  </button>
                  <button className="link-btn danger-text" onClick={() => remove(entry)}>
                    Delete
                  </button>
                </span>
                <time className="log-date" dateTime={entry.timestamp}>
                  {formatDateTime(entry.timestamp)}
                </time>
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

      {filter === 'All' && filtered.length > COLLAPSED_COUNT && (
        <button className="show-more" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show fewer' : `Show all ${filtered.length} entries`}
        </button>
      )}

      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
