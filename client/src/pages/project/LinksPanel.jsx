import { useState } from 'react';
import { api } from '../../api/index.js';
import FileDrop from '../../components/FileDrop.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { LINK_CATEGORIES } from '../../constants.js';
import { fileSize } from '../../utils/format.js';

const ICONS = { CAD: '◳', Code: '</>', Datasheet: '▤', Reference: '↗' };

const guessCategory = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  if (['stl', 'step', 'stp', 'iges', 'igs', 'obj', 'glb', 'gltf', '3mf', 'f3d', 'sldprt', 'sldasm', 'dxf', 'dwg', 'ply'].includes(ext)) return 'CAD';
  if (['js', 'py', 'ino', 'c', 'cpp', 'h', 'gcode', 'nc', 'zip'].includes(ext)) return 'Code';
  if (ext === 'pdf') return 'Datasheet';
  return 'Reference';
};

const guessUrlCategory = (url) => (/github\.com|gitlab|\.io\//i.test(url) ? 'Code' : /onshape|autodesk|a360|grabcad|thingiverse|printables/i.test(url) ? 'CAD' : 'Reference');

export const canFeature = (link) => !link.file || ['model', 'pdf', 'image'].includes(link.file.kind);

export default function LinksPanel({ projectId, links, setLinks, onChanged }) {
  const { notify, deleteWithUndo } = useToasts();
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(0);

  async function addUrl(e) {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const link = await api.links.create(projectId, { url, label: label || url.replace(/^https?:\/\//, '').split(/[/?#]/)[0], category: guessUrlCategory(url) });
      setLinks((list) => [...list, link]);
      setUrl('');
      setLabel('');
      onChanged();
    } catch (err) {
      notify(err.message, { error: true });
    }
  }

  async function addFiles(files) {
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const link = await api.links.upload(projectId, file, { category: guessCategory(file.name) });
        setLinks((list) => [...list, link]);
      } catch (err) {
        notify(`${file.name}: ${err.message}`, { error: true });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onChanged();
  }

  async function update(link, fields) {
    const saved = await api.links.update(link.id, fields);
    setLinks((list) => list.map((l) => (l.id === saved.id ? saved : l)));
    onChanged();
  }

  function remove(link) {
    setLinks((list) => list.filter((l) => l.id !== link.id));
    deleteWithUndo(`Removed ${link.label}`, {
      commit: async () => {
        await api.links.remove(link.id);
        onChanged();
      },
      undo: () => setLinks((list) => [...list, link]),
    });
  }

  const groups = LINK_CATEGORIES.map((c) => ({ category: c, items: links.filter((l) => l.category === c) })).filter((g) => g.items.length);

  return (
    <section className="card panel links-panel" id="links">
      <header className="panel-head">
        <h3>Links & files</h3>
        <span className="muted small">{links.length}</span>
      </header>

      <form className="link-form" onSubmit={addUrl}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a URL (Onshape, GitHub, datasheet…)" aria-label="URL" />
        {url && <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" aria-label="Label" />}
        <button className="btn" disabled={!url.trim()}>
          Add
        </button>
      </form>
      <FileDrop onFiles={addFiles} className="compact">
        <span className="muted small">{uploading ? `Uploading ${uploading}…` : 'Drop files (CAD, PDFs, code) or click to choose'}</span>
      </FileDrop>

      {groups.map((g) => (
        <div key={g.category} className="link-group">
          <div className="link-group-label">
            <span aria-hidden>{ICONS[g.category]}</span> {g.category}
          </div>
          <ul className="link-list">
            {g.items.map((l) => (
              <li key={l.id} id={`link-${l.id}`} className="link-row">
                <a href={l.file ? l.file.url : l.url} target="_blank" rel="noreferrer" className="link-label" title={l.notes || l.url || l.file?.original_name}>
                  {l.label}
                </a>
                <span className="link-meta">
                  {l.file ? (
                    <>
                      <span className="chip-static">{l.file.ext || 'file'}</span>
                      <span className="muted small">{fileSize(l.file.size_bytes)}</span>
                      <a className="link-btn" href={l.file.download_url} title="Download">
                        ⤓
                      </a>
                    </>
                  ) : (
                    <span className="muted small link-host">{l.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                  )}
                  <select className="category-pick" value={l.category} onChange={(e) => update(l, { category: e.target.value })} aria-label="Category">
                    {LINK_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {canFeature(l) && (
                    <button
                      className={`star ${l.featured ? 'on' : ''}`}
                      onClick={() => update(l, { featured: !l.featured })}
                      title={l.featured ? 'Shown in the CAD & drawings viewer — click to hide' : 'Show in the CAD & drawings viewer'}
                      aria-pressed={l.featured}
                    >
                      {l.featured ? '★' : '☆'}
                    </button>
                  )}
                  <button className="row-remove" onClick={() => remove(l)} aria-label={`Remove ${l.label}`}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
