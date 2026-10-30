import { Camera, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import EmptyState from '../../components/EmptyState.jsx';
import InlineText from '../../components/InlineText.jsx';
import Lightbox from '../../components/Lightbox.jsx';
import PhotoDrop from '../../components/PhotoDrop.jsx';
import { useToasts } from '../../components/Toasts.jsx';

const byNewest = (a, b) => b.taken_on.localeCompare(a.taken_on) || b.id - a.id;
const COLLAPSED = 10;

export default function PhotosSection({ project, photos, setPhotos, entries, save, onChanged }) {
  const { notify, deleteWithUndo } = useToasts();
  const [uploading, setUploading] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);

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
  const setCover = (photo) => save({ cover_photo_id: project.cover_photo_id === photo.id ? null : photo.id });

  return (
    <div className="photos">
      {photos.length > 0 && (
        <div className="photo-grid">
          {shown.map((photo, i) => {
            const isCover = project.cover_photo_id === photo.id;
            return (
              <figure key={photo.id} id={`photo-${photo.id}`} className="photo-tile">
                <button className="photo-tile-img" onClick={() => setLightboxIndex(i)} title="Open">
                  <img src={photo.thumb_url} alt={photo.caption || photo.original_name} loading="lazy" />
                </button>
                <span className="photo-tile-tools">
                  <button className={`tile-tool ${isCover ? 'on' : ''}`} onClick={() => setCover(photo)} title={isCover ? 'Cover photo — click to unset' : 'Use as cover'} aria-label="Cover photo">
                    <Star size={13} fill={isCover ? 'currentColor' : 'none'} />
                  </button>
                  <button className="tile-tool" onClick={() => remove(photo)} title="Delete photo" aria-label="Delete photo">
                    <Trash2 size={13} />
                  </button>
                </span>
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            );
          })}
        </div>
      )}
      {photos.length > COLLAPSED && (
        <button className="show-more" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show fewer' : `Show all ${photos.length} photos`}
        </button>
      )}

      {photos.length === 0 && (
        <EmptyState icon={Camera} title="No photos yet">
          Progress shots, test setups, failures worth remembering. The first one becomes the cover.
        </EmptyState>
      )}
      <PhotoDrop pasteWhenIdle compact={photos.length > 0} onFiles={upload} label={uploading ? `Uploading ${uploading}…` : 'Drop or paste photos, or'} />

      {lightboxIndex !== null && (
        <Lightbox
          photos={shown}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          details={(photo) => (
            <div className="photo-details">
              <label>
                <span className="muted small">Caption</span>
                <InlineText value={photo.caption} onSave={(caption) => update(photo, { caption })} placeholder="Add a caption…" multiline />
              </label>
              <label>
                <span className="muted small">Date</span>
                <input type="date" className="inline-date" value={photo.taken_on} onChange={(e) => e.target.value && update(photo, { taken_on: e.target.value })} />
              </label>
              <label>
                <span className="muted small">Log entry</span>
                <select className="inline-select" value={photo.log_entry_id ?? ''} onChange={(e) => update(photo, { log_entry_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">None</option>
                  {entries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="photo-detail-actions">
                <button className="btn btn-small" onClick={() => setCover(photo)}>
                  {project.cover_photo_id === photo.id ? 'Remove as cover' : 'Use as cover'}
                </button>
                <button className="btn btn-small btn-danger" onClick={() => remove(photo)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
