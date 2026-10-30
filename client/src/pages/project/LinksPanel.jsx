import { useRef, useState } from 'react';
import { api } from '../../api/index.js';
import { useToasts } from '../../components/Toasts.jsx';
import { LINK_CATEGORIES } from '../../constants.js';
import { fileSize } from '../../utils/format.js';

const guessCategory = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  if (['stl', 'step', 'stp', 'iges', 'igs', 'obj', 'glb', 'gltf', '3mf', 'f3d', 'sldprt', 'sldasm', 'dxf', 'dwg', 'ply'].includes(ext)) return 'CAD';
  if (['js', 'py', 'ino', 'c', 'cpp', 'h', 'gcode', 'nc', 'zip'].includes(ext)) return 'Code';
  if (ext === 'pdf') return 'Datasheet';
  return 'Reference';
};

const guessUrlCategory = (url) => (/github\.com|gitlab|\.io\//i.test(url) ? 'Code' : /onshape|autodesk|a360|grabcad|thingiverse|printables/i.test(url) ? 'CAD' : 'Reference');

const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0];

export default function LinksPanel({ projectId, links, setLinks, onChanged }) {
  const { notify, deleteWithUndo } = useToasts();
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  const fileInput = useRef(null);

  async function addUrl(e) {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const link = await api.links.create(projectId, { url, label: host(url.startsWith('http') ? url : `https://${url}`), category: guessUrlCategory(url) });
      setLinks((list) => [...list, link]);
      setUrl('');
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
    <div
      className={`links ${over ? 'drop-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]);
      }}
    >
      {groups.map((g) => (
        <div key={g.category} className="link-group">
          <div className="group-label">{g.category}</div>
          <ul className="link-list">
            {g.items.map((l) => (
              <li key={l.id} id={`link-${l.id}`} className="link-row">
                <a href={l.file ? l.file.url : l.url} target="_blank" rel="noreferrer" className="link-label" title={l.notes || l.url || l.file?.original_name}>
                  {l.label}
                </a>
                <span className="link-meta">{l.file ? `${l.file.ext.toUpperCase()} · ${fileSize(l.file.size_bytes)}` : host(l.url)}</span>
                <span className="row-tools">
                  {(!l.file || ['model', 'pdf', 'image'].includes(l.file.kind)) && (
                    <button
                      className={`star ${l.featured ? 'on' : ''}`}
                      onClick={() => update(l, { featured: !l.featured })}
                      title={l.featured ? 'Shown in CAD & drawings — click to hide' : 'Show in CAD & drawings'}
                      aria-pressed={l.featured}
                    >
                      {l.featured ? '★' : '☆'}
                    </button>
                  )}
                  <select className="category-pick" value={l.category} onChange={(e) => update(l, { category: e.target.value })} aria-label="Category">
                    {LINK_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button className="row-remove" onClick={() => remove(l)} aria-label={`Remove ${l.label}`}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {links.length === 0 && <p className="empty-state">Datasheets, repos, CAD files — paste a link or drop a file here.</p>}

      <form className="link-form" onSubmit={addUrl}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link…" aria-label="URL" />
        {url && <button className="btn btn-small btn-primary">Add</button>}
        <button type="button" className="link-btn" onClick={() => fileInput.current.click()}>
          {uploading ? `Uploading ${uploading}…` : 'Upload file'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files.length) addFiles([...e.target.files]);
            e.target.value = '';
          }}
        />
      </form>
    </div>
  );
}
