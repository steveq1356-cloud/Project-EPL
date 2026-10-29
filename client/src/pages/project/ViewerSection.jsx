import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import FileDrop from '../../components/FileDrop.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { fileSize } from '../../utils/format.js';

const ModelViewer = lazy(() => import('../../components/viewer/ModelViewer.jsx'));

const MODEL_ACCEPT = '.stl,.step,.stp,.iges,.igs,.obj,.glb,.gltf,.3mf,.ply,.pdf,image/*';
const TAB_KEY = (projectId) => `epl-viewer-tab-${projectId}`;

function kindOf(link) {
  if (!link.file) return 'embed';
  return link.file.kind; // model | pdf | image | file
}

function ViewerPane({ link }) {
  const kind = kindOf(link);
  if (kind === 'model') {
    return (
      <Suspense fallback={<div className="model-overlay">Loading 3D viewer…</div>}>
        <ModelViewer key={link.id} url={link.file.url} ext={link.file.ext} name={link.file.original_name} />
      </Suspense>
    );
  }
  if (kind === 'pdf') {
    return (
      <div className="doc-pane">
        <iframe title={link.label} src={`${link.file.url}#view=FitH&toolbar=1`} />
        <p className="muted small doc-note">
          PDF drawings render here. A <strong>3D PDF</strong>'s model (U3D/PRC) only shows in Adobe Acrobat or Reader —{' '}
          <a href={link.file.download_url}>download it</a> to open there, or export STEP/STL from your CAD to view it in 3D here.
        </p>
      </div>
    );
  }
  if (kind === 'image') {
    return (
      <div className="doc-pane image-pane">
        <img src={link.file.url} alt={link.label} />
      </div>
    );
  }
  return (
    <div className="doc-pane">
      <iframe title={link.label} src={link.url} allow="fullscreen; clipboard-read; clipboard-write; serial; usb" />
      <p className="muted small doc-note">
        Embedded from {link.url.replace(/^https?:\/\//, '').split('/')[0]}. If it stays blank, that site doesn't allow embedding —{' '}
        <a href={link.url} target="_blank" rel="noreferrer">
          open it in a new tab
        </a>
        .
      </p>
    </div>
  );
}

export default function ViewerSection({ projectId, links, setLinks, onChanged }) {
  const { notify } = useToasts();
  const items = links.filter((l) => l.featured && (!l.file || ['model', 'pdf', 'image'].includes(l.file.kind)));
  const [activeId, setActiveId] = useState(() => {
    try {
      return Number(localStorage.getItem(TAB_KEY(projectId))) || null;
    } catch {
      return null;
    }
  });
  const [uploading, setUploading] = useState(0);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embed, setEmbed] = useState({ url: '', label: '' });
  const [full, setFull] = useState(false);
  const active = items.find((l) => l.id === activeId) ?? items[0];

  useEffect(() => {
    if (!active) return;
    try {
      localStorage.setItem(TAB_KEY(projectId), String(active.id));
    } catch {
      // not remembered — fine
    }
  }, [active?.id, projectId]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  async function upload(files) {
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const link = await api.links.upload(projectId, file, { category: 'CAD', featured: true });
        setLinks((list) => [...list, link]);
        setActiveId(link.id);
      } catch (e) {
        notify(`${file.name}: ${e.message}`, { error: true });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onChanged();
  }

  async function addEmbed(e) {
    e.preventDefault();
    try {
      const link = await api.links.create(projectId, {
        url: embed.url,
        label: embed.label || embed.url.replace(/^https?:\/\//, '').split(/[/?#]/)[0],
        category: /onshape|autodesk|a360|grabcad|sketchfab/i.test(embed.url) ? 'CAD' : 'Reference',
        featured: true,
      });
      setLinks((list) => [...list, link]);
      setActiveId(link.id);
      setEmbed({ url: '', label: '' });
      setEmbedOpen(false);
      onChanged();
    } catch (err) {
      notify(err.message, { error: true });
    }
  }

  async function unfeature(link) {
    const saved = await api.links.update(link.id, { featured: false });
    setLinks((list) => list.map((l) => (l.id === saved.id ? saved : l)));
  }

  return (
    <section id="viewer" className={`card viewer-section ${full ? 'fullscreen' : ''}`}>
      <header className="panel-head">
        <h2>
          <span className="section-num">03</span> CAD & drawings
        </h2>
        <div className="viewer-actions">
          <button className="btn btn-small" onClick={() => setEmbedOpen((o) => !o)}>
            + Embed URL
          </button>
          <FileDrop onFiles={upload} accept={MODEL_ACCEPT} className="inline">
            <span className="btn btn-small">{uploading ? `Uploading ${uploading}…` : '+ Add model / drawing'}</span>
          </FileDrop>
          {active && (
            <button className="btn btn-small" onClick={() => setFull((f) => !f)} title="Fill the screen (Esc to exit)">
              {full ? 'Exit full screen' : 'Full screen'}
            </button>
          )}
        </div>
      </header>

      {embedOpen && (
        <form className="embed-form" onSubmit={addEmbed}>
          <input value={embed.url} onChange={(e) => setEmbed({ ...embed, url: e.target.value })} placeholder="Onshape / Fusion 360 share link, Sketchfab, a web tool…" autoFocus required />
          <input value={embed.label} onChange={(e) => setEmbed({ ...embed, label: e.target.value })} placeholder="Label" />
          <button className="btn btn-primary">Embed</button>
        </form>
      )}

      {items.length === 0 ? (
        <FileDrop onFiles={upload} accept={MODEL_ACCEPT} className="viewer-empty">
          <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden className="viewer-empty-art">
            <path d="M60 8 L100 28 L60 48 L20 28 Z" />
            <path d="M20 28 L20 56 L60 76 L60 48" />
            <path d="M100 28 L100 56 L60 76" />
          </svg>
          <strong>Drop a CAD model or drawing here</strong>
          <span className="muted small">STL · STEP · IGES · OBJ · GLB · 3MF · PDF — or embed an Onshape/Fusion link. Files you star ☆ in Links & files show up here too.</span>
        </FileDrop>
      ) : (
        <>
          <div className="viewer-tabs" role="tablist">
            {items.map((l) => (
              <button key={l.id} role="tab" aria-selected={active?.id === l.id} className={`viewer-tab ${active?.id === l.id ? 'active' : ''}`} onClick={() => setActiveId(l.id)}>
                <span className="chip-static">{l.file ? l.file.ext : 'web'}</span>
                {l.label}
              </button>
            ))}
          </div>
          {active && (
            <div className="viewer-stage">
              <ViewerPane link={active} />
              <div className="viewer-footer">
                <span className="muted small">
                  {active.notes || (active.file ? `${active.file.original_name} · ${fileSize(active.file.size_bytes)}` : active.url)}
                </span>
                <span className="viewer-footer-actions">
                  {active.file ? (
                    <a className="link-btn" href={active.file.download_url}>
                      Download
                    </a>
                  ) : (
                    <a className="link-btn" href={active.url} target="_blank" rel="noreferrer">
                      Open in new tab
                    </a>
                  )}
                  <button className="link-btn" onClick={() => unfeature(active)} title="Keeps it in Links & files">
                    Hide from viewer
                  </button>
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
