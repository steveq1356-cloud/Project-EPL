import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/index.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { BarList, ChartCard, Heatmap, heatmapTable, Meter } from '../components/charts/Charts.jsx';
import { useData } from '../components/DataContext.jsx';
import { PROJECT_SECTIONS, SPENT_STATUSES } from '../constants.js';
import { money, plural } from '../utils/format.js';
import KeyFigures from './project/KeyFigures.jsx';
import LinksPanel from './project/LinksPanel.jsx';
import Notebook from './project/Notebook.jsx';
import PhotosSection from './project/PhotosSection.jsx';
import PurchasesSection from './project/PurchasesSection.jsx';
import TasksPanel from './project/TasksPanel.jsx';
import TitleBlock from './project/TitleBlock.jsx';
import ViewerSection from './project/ViewerSection.jsx';

const EMPTY = { project: null, log: null, tasks: null, purchases: null, links: null, photos: null, insights: null };

// Side-column spend summary; the full table lives in the Purchases section.
function SpendPanel({ project, purchases, onAdd }) {
  const spent = purchases.filter((p) => SPENT_STATUSES.includes(p.status));
  const spentCents = spent.reduce((s, p) => s + p.total_cents, 0);
  const planned = purchases.filter((p) => p.status === 'Planned');
  const transit = purchases.filter((p) => p.status === 'Ordered');
  const byCategory = Object.entries(
    spent.reduce((m, p) => ({ ...m, [p.category || 'Uncategorized']: (m[p.category || 'Uncategorized'] ?? 0) + p.total_cents }), {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="card panel spend-panel">
      <header className="panel-head">
        <h3>Spend</h3>
        <button className="btn btn-small" onClick={onAdd}>
          + Purchase
        </button>
      </header>
      <div className="spend-hero">
        <span className="spend-value">{money(spentCents)}</span>
        {project.budget_cents ? (
          <span className="muted small">of {money(project.budget_cents, { whole: true })} budget</span>
        ) : (
          <span className="muted small">{plural(spent.length, 'order')}</span>
        )}
      </div>
      {project.budget_cents ? <Meter value={spentCents} max={project.budget_cents} label="Spent of budget" /> : null}
      <dl className="mini-stats">
        <div>
          <dt>Planned</dt>
          <dd>{money(planned.reduce((s, p) => s + p.total_cents, 0), { whole: true })}</dd>
        </div>
        <div>
          <dt>In transit</dt>
          <dd>{transit.length}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{purchases.length}</dd>
        </div>
      </dl>
      {byCategory.length > 0 && <BarList items={byCategory} max={4} format={(v, s) => money(v, { whole: true, compact: s })} />}
      {purchases.length > 0 && (
        <a className="link-btn" href="#purchases">
          All purchases & charts ↓
        </a>
      )}
    </section>
  );
}

export default function ProjectPage() {
  const { id: idParam, tab } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { changed: globalChanged } = useData();
  const [d, setD] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState(null);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const scrolledFor = useRef(null);

  // Old tab URLs (/projects/3/log) now jump to that section on the one page.
  useEffect(() => {
    if (tab) navigate(`/projects/${id}#${tab === 'log' ? 'notebook' : tab === 'links' ? 'links' : tab}`, { replace: true });
  }, [tab]);

  const set = (key) => (value) => setD((prev) => ({ ...prev, [key]: typeof value === 'function' ? value(prev[key]) : value }));
  const setters = useRef({});
  for (const key of Object.keys(EMPTY)) setters.current[key] ??= set(key);
  const S = setters.current;

  const loaders = {
    project: () => api.projects.get(id),
    log: () => api.log.list(id),
    tasks: () => api.tasks.list(id),
    purchases: () => api.purchases.list(id),
    links: () => api.links.list(id),
    photos: () => api.photos.list(id),
    insights: () => api.projects.insights(id),
  };
  const reload = (...keys) => Promise.all(keys.map((k) => loaders[k]().then(S[k]))).catch(() => {});

  useEffect(() => {
    setD(EMPTY);
    setError(null);
    scrolledFor.current = null;
    Promise.all(Object.entries(loaders).map(([k, load]) => load().then((v) => [k, v])))
      .then((pairs) => setD(Object.fromEntries(pairs)))
      .catch((e) => setError(e.message));
  }, [id]);

  // Quick add (from the sidebar or a shortcut) added something to this project.
  useEffect(() => {
    const onAdded = (e) => {
      if (e.detail.projectId !== id) return;
      reload(e.detail.list, 'insights', 'photos');
    };
    window.addEventListener('epl:added', onAdded);
    return () => window.removeEventListener('epl:added', onAdded);
  }, [id]);

  // Something changed in a section: refresh the numbers that depend on it.
  const onChanged = useCallback(
    (opts = {}) => {
      reload('insights', 'photos', ...(opts.project ? ['project'] : []));
      if (opts.log) reload('log');
      globalChanged();
    },
    [id],
  );

  const save = useCallback(
    async (fields) => {
      const before = d.project;
      setD((prev) => ({ ...prev, project: { ...prev.project, ...fields } }));
      setSaveState('saving');
      try {
        S.project(await api.projects.update(id, fields));
        setSaveState('saved');
        reload('insights');
        globalChanged();
      } catch (e) {
        S.project(before);
        setSaveState(e.message);
      }
    },
    [d.project, id],
  );

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState(null), 1500);
    return () => clearTimeout(t);
  }, [saveState]);

  useEffect(() => {
    if (d.project) document.title = `${d.project.name} · EPL`;
  }, [d.project?.name]);

  const loaded = Object.values(d).every(Boolean);

  // Jump to #log-12, #purchase-3, #photos… once everything has rendered, and flash it.
  useEffect(() => {
    if (!loaded || !location.hash || scrolledFor.current === location.key) return;
    scrolledFor.current = location.key;
    requestAnimationFrame(() => {
      const el = document.getElementById(location.hash.slice(1));
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 2200);
    });
  }, [loaded, location.key, location.hash]);

  // Highlight the section-nav item for the section on screen.
  useEffect(() => {
    if (!loaded) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    PROJECT_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [loaded]);

  if (error) {
    return (
      <main className="page">
        <p className="error">Couldn't load this project: {error}</p>
        <p>
          <button className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>{' '}
          <Link to="/">← Back to dashboard</Link>
        </p>
      </main>
    );
  }
  if (!loaded) return <main className="page muted">Loading…</main>;

  const { project, insights } = d;
  const stats = insights.stats;
  const counts = {
    notebook: d.log.length,
    viewer: d.links.filter((l) => l.featured).length,
    photos: d.photos.length,
    purchases: d.purchases.length,
  };

  async function removeProject() {
    const typed = window.prompt(
      `Delete "${project.name}" and everything in it (log, purchases, tasks, photos, files)?\n\nThis can't be undone. Type the project name to confirm:`,
    );
    if (typed?.trim() !== project.name) return;
    await api.projects.remove(project.id);
    globalChanged();
    navigate('/');
  }

  return (
    <main className="page project-page">
      <nav className="section-nav" aria-label="Sections">
        <Link to="/" className="section-nav-back">
          ← Dashboard
        </Link>
        <span className="section-nav-name">{project.name}</span>
        {PROJECT_SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={activeSection === s.id ? 'active' : ''}>
            {s.label}
            {counts[s.id] ? <span className="count">{counts[s.id]}</span> : null}
          </a>
        ))}
      </nav>

      <TitleBlock project={project} stats={stats} save={save} saveState={saveState} />
      <KeyFigures project={project} stats={stats} save={save} />

      <div className="project-grid-main">
        <Notebook projectId={id} entries={d.log} setEntries={S.log} onChanged={onChanged} initialExpanded={location.hash.startsWith('#log-')} />
        <aside className="project-side">
          <TasksPanel projectId={id} tasks={d.tasks} setTasks={S.tasks} onChanged={onChanged} />
          <SpendPanel
            project={project}
            purchases={d.purchases}
            onAdd={() => {
              setPurchaseFormOpen(true);
              requestAnimationFrame(() => document.getElementById('purchases')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            }}
          />
          <LinksPanel projectId={id} links={d.links} setLinks={S.links} onChanged={onChanged} />
        </aside>
      </div>

      <ViewerSection projectId={id} links={d.links} setLinks={S.links} onChanged={onChanged} />
      <PhotosSection project={project} photos={d.photos} setPhotos={S.photos} entries={d.log} save={save} onChanged={onChanged} />
      <PurchasesSection project={project} purchases={d.purchases} setPurchases={S.purchases} onChanged={onChanged} formOpen={purchaseFormOpen} setFormOpen={setPurchaseFormOpen} />

      <section id="activity" className="activity-section">
        <ChartCard title="Activity" subtitle="Last 26 weeks" table={heatmapTable(insights.activity_by_day)} className="span-2">
          <Heatmap byDay={insights.activity_by_day} />
        </ChartCard>
        <section className="card panel">
          <header className="panel-head">
            <h3>Recent</h3>
          </header>
          <ActivityFeed items={insights.recent} showProject={false} />
        </section>
      </section>

      <footer className="danger-zone">
        <span className="muted small">
          {project.name} · created {new Date(project.created_at).toLocaleDateString()} · last edited {new Date(project.updated_at).toLocaleString()}
        </span>
        <button className="btn btn-danger btn-small" onClick={removeProject}>
          Delete project
        </button>
      </footer>
    </main>
  );
}
