import { useState } from 'react';
import { api } from '../../api/index.js';
import InlineText from '../../components/InlineText.jsx';
import Lightbox from '../../components/Lightbox.jsx';
import PhotoDrop from '../../components/PhotoDrop.jsx';
import { useToasts } from '../../components/Toasts.jsx';

const byNewest = (a, b) => b.taken_on.localeCompare(a.taken_on) || b.id - a.id;
const COLLAPSED = 12;

export default function PhotosSection({ project, photos, setPhotos, entries, save, onChanged }) {
  const { notify, deleteWithUndo } = useToasts();
  const [uploading, setUploading] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const entryTitle = Object.fromEntries(entries.map((e) => [e.id, e.title]));

  async function upload(files) {
    setUploading((n) => n + files.length);
    try {
      const created = await api.photos.upload(project.id, files);
      setPhotos((list) => [...created, ...list].sort(byNewest));
      notify(`Uploaded ${created.length} photo${created.length === 1 ? '' : 's'}`);
      // The first photo of a project becomes its cover automatically.
      if (!project.cover_photo_id) save({ cover_photo_id: created[0].id });
      onChanged();
    } catch (e) {
      notify(e.message, { error: true });
    } finally {
      setUploading((n) => n - files.length);
    }
  }

  async function update(photo, fields) {
    setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, ...fields } : p)));
    try {
      const saved = await api.photos.update(photo.id, fields);
      setPhotos((list) => list.map((p) => (p.id === saved.id ? saved : p)).sort(byNewest));
      onChanged({ log: 'log_entry_id' in fields });
    } catch (e) {
      setPhotos((list) => list.map((p) => (p.id === photo.id ? photo : p)));
      notify(e.message, { error: true });
    }
  }

  function remove(photo) {
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    deleteWithUndo(`Deleted ${photo.caption || photo.original_name}`, {
      commit: async () => {
        await api.photos.remove(photo.id);
        onChanged({ project: project.cover_photo_id === photo.id, log: Boolean(photo.log_entry_id) });
      },
      undo: () => setPhotos((list) => [...list, photo].sort(byNewest)),
    });
  }

  const shown = expanded ? photos : photos.slice(0, COLLAPSED);

  return (
    <section id="photos" className="card photos-section">
      <header className="panel-head">
        <h2>
          <span className="section-num">04</span> Photos
        </h2>
        <span className="muted small">{photos.length}</span>
      </header>

      <PhotoDrop pasteWhenIdle onFiles={upload} label={uploading ? `Uploading ${uploading}…` : 'Drop photos here, paste a screenshot (Ctrl+V), or'} />

      {photos.length > 0 && (
        <div className="photo-grid">
          {shown.map((photo, i) => {
            const isCover = project.cover_photo_id === photo.id;
            return (
              <figure key={photo.id} id={`photo-${photo.id}`} className={`photo-card ${isCover ? 'is-cover' : ''}`}>
                <button className="photo-card-img" onClick={() => setLightboxIndex(i)} title="View full size">
                  <img src={photo.thumb_url} alt={photo.caption || photo.original_name} loading="lazy" />
                  {isCover && <span className="cover-badge">Cover</span>}
                </button>
                <figcaption>
                  <InlineText value={photo.caption} onSave={(caption) => update(photo, { caption })} placeholder="Add caption…" />
                  <div className="photo-meta">
                    <input
                      type="date"
                      className="inline-date small"
                      value={photo.taken_on}
                      onChange={(e) => e.target.value && update(photo, { taken_on: e.target.value })}
                      aria-label="Photo date"
                    />
                    <select
                      className="inline-select small"
                      value={photo.log_entry_id ?? ''}
                      onChange={(e) => update(photo, { log_entry_id: e.target.value ? Number(e.target.value) : null })}
                      aria-label="Linked log entry"
                      title={photo.log_entry_id ? `Linked to: ${entryTitle[photo.log_entry_id]}` : 'Not linked to a log entry'}
                    >
                      <option value="">No log entry</option>
                      {entries.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="photo-actions">
                    <button className="btn btn-small btn-ghost" onClick={() => save({ cover_photo_id: isCover ? null : photo.id })}>
                      {isCover ? 'Remove cover' : 'Set as cover'}
                    </button>
                    <button className="btn btn-small btn-ghost danger-text" onClick={() => remove(photo)}>
                      Delete
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
      {photos.length > COLLAPSED && (
        <button className="btn show-more" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show fewer' : `Show all ${photos.length} photos`}
        </button>
      )}

      {lightboxIndex !== null && <Lightbox photos={shown} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </section>
  );
}
