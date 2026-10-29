import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { LOG_TYPES } from '../constants.js';
import { fromLocalInput, toLocalInput } from '../utils/dates.js';
import Markdown from './Markdown.jsx';
import PhotoDrop from './PhotoDrop.jsx';

// Create or edit a log entry, including its photos. Ctrl+Enter saves.
// For an existing entry, removing a photo only unlinks it — it stays in the Photos tab.
export default function LogEntryForm({ projectId, entry, onSaved, onCancel, autoFocus = false }) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [type, setType] = useState(entry?.type ?? 'Note');
  const [body, setBody] = useState(entry?.body ?? '');
  const [when, setWhen] = useState(toLocalInput(entry?.timestamp));
  const [keptPhotos, setKeptPhotos] = useState(entry?.photos ?? []);
  const [newFiles, setNewFiles] = useState([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const previews = useMemo(() => newFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [newFiles]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  async function submit(e) {
    e?.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const fields = { title, type, body, timestamp: fromLocalInput(when) };
      const saved = entry ? await api.log.update(entry.id, fields) : await api.log.create(projectId, fields);

      const removed = (entry?.photos ?? []).filter((p) => !keptPhotos.some((k) => k.id === p.id));
      await Promise.all(removed.map((p) => api.photos.update(p.id, { log_entry_id: null })));
      if (newFiles.length) await api.photos.upload(projectId, newFiles, { logEntryId: saved.id });

      onSaved(await api.log.get(saved.id));
      if (!entry) {
        setTitle('');
        setBody('');
        setType('Note');
        setWhen(toLocalInput());
        setNewFiles([]);
        setPreview(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
    if (e.key === 'Escape' && onCancel) {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <form className="log-form" onSubmit={submit} onKeyDown={onKeyDown}>
      <div className="log-form-row">
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Entry type">
          {LOG_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          className="log-form-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={entry ? 'Title' : 'New log entry — what happened?'}
          autoFocus={autoFocus}
          aria-label="Title"
        />
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Date and time" />
      </div>

      <div className="log-form-body">
        <div className="log-form-body-tabs">
          <button type="button" className={`link-btn ${preview ? '' : 'active'}`} onClick={() => setPreview(false)}>
            Write
          </button>
          <button type="button" className={`link-btn ${preview ? 'active' : ''}`} onClick={() => setPreview(true)}>
            Preview
          </button>
          <span className="muted small">Markdown supported · Ctrl+Enter to save</span>
        </div>
        {preview ? (
          <div className="log-form-preview">{body.trim() ? <Markdown>{body}</Markdown> : <p className="muted">Nothing to preview.</p>}</div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={Math.min(14, Math.max(3, body.split('\n').length + 1))}
            placeholder="Details, measurements, what you tried… (optional)"
            aria-label="Body"
          />
        )}
      </div>

      {(keptPhotos.length > 0 || previews.length > 0) && (
        <div className="thumb-row">
          {keptPhotos.map((p) => (
            <figure key={p.id} className="thumb">
              <img src={p.thumb_url} alt={p.caption || p.original_name} />
              <button type="button" className="thumb-remove" title="Remove from this entry (stays in Photos)" onClick={() => setKeptPhotos(keptPhotos.filter((k) => k.id !== p.id))}>
                ×
              </button>
            </figure>
          ))}
          {previews.map((p) => (
            <figure key={p.url} className="thumb pending">
              <img src={p.url} alt={p.file.name} />
              <button type="button" className="thumb-remove" title="Don't upload" onClick={() => setNewFiles(newFiles.filter((f) => f !== p.file))}>
                ×
              </button>
            </figure>
          ))}
        </div>
      )}

      <PhotoDrop compact pasteWhenIdle={!entry} onFiles={(files) => setNewFiles((list) => [...list, ...files])} />

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
          {saving ? (newFiles.length ? 'Uploading…' : 'Saving…') : entry ? 'Save changes' : 'Add entry'}
        </button>
      </div>
    </form>
  );
}
