import { Archive, Download, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/index.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { Heatmap } from '../components/charts/Charts.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useData } from '../components/DataContext.jsx';
import Section from '../components/Section.jsx';
import { useToasts } from '../components/Toasts.jsx';
import { BUILTIN_SECTIONS, CUSTOM_KINDS } from '../constants.js';
import { money } from '../utils/format.js';
import { colorFor } from '../utils/projectColor.js';
import { ChecklistSection, EmbedSection, NotesSection, TableSection } from './project/CustomSections.jsx';
import CustomizeDialog from './project/CustomizeDialog.jsx';
import FiguresSection from './project/FiguresSection.jsx';
import LinksPanel from './project/LinksPanel.jsx';
import Notebook from './project/Notebook.jsx';
import PhotosSection from './project/PhotosSection.jsx';
import ProjectHeader from './project/ProjectHeader.jsx';
import PurchasesSection from './project/PurchasesSection.jsx';
import TasksPanel from './project/TasksPanel.jsx';
import ViewerSection from './project/ViewerSection.jsx';

const EMPTY = { project: null, log: null, tasks: null, purchases: null, links: null, photos: null, sections: null, insights: null };

const DEFAULT_DATA = {
  notes: { body: '' },
  checklist: { items: [] },
  table: { columns: [{ name: 'X', unit: '' }, { name: 'Y', unit: '' }], rows: [['', ''], ['', '']], chart: null },
  embed: { url: '', height: 560 },
};

// Groups the layout into rows: consecutive "half" sections share a row.
function toRows(layout, sizeOf) {
  const rows = [];
  for (const key of layout) {
    const last = rows.at(-1);
    if (sizeOf(key) === 'half' && last?.length === 1 && sizeOf(last[0]) === 'half') last.push(key);
    else rows.push([key]);
  }
  return rows;
}

export default function ProjectPage() {
  const { id: idParam, tab } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { changed: globalChanged } = useData();
  const { notify } = useToasts();
  const [d, setD] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState(null);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // 'customize' | 'delete' | { deleteSection }
  const [activeSection, setActiveSection] = useState('overview');
  const scrolledFor = useRef(null);

  // Old tab URLs (/projects/3/log) jump to that section on the one page.
  useEffect(() => {
    if (tab) navigate(`/projects/${id}#${tab === 'log' ? 'notebook' : tab}`, { replace: true });
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
    sections: () => api.sections.list(id),
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

  // Quick add (sidebar or shortcut) added something to this project.
  useEffect(() => {
    const onAdded = (e) => e.detail.projectId === id && reload(e.detail.list, 'insights', 'photos');
    window.addEventListener('epl:added', onAdded);
    return () => window.removeEventListener('epl:added', onAdded);
  }, [id]);

  const onChanged = useCallback(
    (opts = {}) => {
      reload('insights', 'photos', ...(opts.project ? ['project'] : []), ...(opts.log ? ['log'] : []));
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

  // Highlight the nav item for the section on screen.
  useEffect(() => {
    if (!loaded) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    document.querySelectorAll('.project-page .section, .project-header').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loaded, d.project?.layout?.join()]);

  if (error) {
    return (
      <main className="page">
        <p className="error">Couldn't load this project: {error}</p>
        <p>
          <button className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>{' '}
          <Link to="/">Back to dashboard</Link>
        </p>
      </main>
    );
  }
  if (!loaded) return <main className="page muted">Loading…</main>;

  const { project, insights, sections } = d;
  const stats = insights.stats;
  const custom = Object.fromEntries(sections.map((s) => [`custom:${s.id}`, s]));
  const layout = project.layout.filter((k) => BUILTIN_SECTIONS[k] || custom[k]);
  const sizeOf = (key) => BUILTIN_SECTIONS[key]?.size ?? CUSTOM_KINDS[custom[key]?.kind]?.size ?? 'full';
  const anchorOf = (key) => (key.startsWith('custom:') ? `section-${key.slice(7)}` : key);

  const setLayout = (next) => save({ layout: next });

  async function addCustom(kind) {
    const title = CUSTOM_KINDS[kind].label === 'Data table' ? 'Data' : CUSTOM_KINDS[kind].label;
    const { section, project: p } = await api.sections.create(id, { kind, title, data: DEFAULT_DATA[kind] });
    S.sections((list) => [...list, section]);
    S.project(p);
    setDialog(null);
    requestAnimationFrame(() => document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function saveSection(sectionId, fields) {
    try {
      const saved = await api.sections.update(sectionId, fields);
      S.sections((list) => list.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      notify(e.message, { error: true });
    }
  }

  async function deleteSection(section) {
    await api.sections.remove(section.id);
    S.sections((list) => list.filter((s) => s.id !== section.id));
    S.project((p) => ({ ...p, layout: p.layout.filter((k) => k !== `custom:${section.id}`) }));
    notify(`Deleted “${section.title}”`);
  }

  async function setArchived(archived) {
    await save({ archived });
    notify(archived ? `${project.name} archived — find it under Archived in the sidebar` : `${project.name} restored`);
  }

  const counts = {
    notebook: d.log.length,
    tasks: stats.open_tasks || null,
    links: d.links.length || null,
    photos: d.photos.length || null,
    purchases: d.purchases.length ? money(stats.spent_cents, { whole: true }) : null,
  };

  function controlsFor(key, i) {
    const c = custom[key];
    return {
      up: i > 0 ? () => setLayout(layout.map((k, j) => (j === i - 1 ? key : j === i ? layout[i - 1] : k))) : null,
      down: i < layout.length - 1 ? () => setLayout(layout.map((k, j) => (j === i + 1 ? key : j === i ? layout[i + 1] : k))) : null,
      hide: c ? null : () => setLayout(layout.filter((k) => k !== key)),
      remove: c ? () => setDialog({ deleteSection: c }) : null,
    };
  }

  function renderSection(key) {
    const i = layout.indexOf(key);
    const controls = controlsFor(key, i);
    const c = custom[key];
    if (c) {
      const Body = { notes: NotesSection, checklist: ChecklistSection, table: TableSection, embed: EmbedSection }[c.kind];
      return (
        <Section id={anchorOf(key)} title={c.title} icon={CUSTOM_KINDS[c.kind].icon} controls={controls} onRename={(title) => saveSection(c.id, { title })}>
          <Body section={c} save={(data) => saveSection(c.id, { data })} />
        </Section>
      );
    }
    const common = { id: key, title: BUILTIN_SECTIONS[key].label, icon: BUILTIN_SECTIONS[key].icon, count: counts[key], controls };
    switch (key) {
      case 'figures':
        return (
          <Section {...common} bare>
            <FiguresSection project={project} save={save} />
          </Section>
        );
      case 'notebook':
        return (
          <Section {...common}>
            <Notebook projectId={id} entries={d.log} setEntries={S.log} onChanged={onChanged} initialExpanded={location.hash.startsWith('#log-')} />
          </Section>
        );
      case 'tasks':
        return (
          <Section {...common}>
            <TasksPanel projectId={id} tasks={d.tasks} setTasks={S.tasks} onChanged={onChanged} />
          </Section>
        );
      case 'links':
        return (
          <Section {...common}>
            <LinksPanel projectId={id} links={d.links} setLinks={S.links} onChanged={onChanged} />
          </Section>
        );
      case 'viewer':
        return (
          <Section {...common}>
            <ViewerSection projectId={id} links={d.links} setLinks={S.links} onChanged={onChanged} />
          </Section>
        );
      case 'photos':
        return (
          <Section {...common}>
            <PhotosSection project={project} photos={d.photos} setPhotos={S.photos} entries={d.log} save={save} onChanged={onChanged} />
          </Section>
        );
      case 'purchases':
        return (
          <Section
            {...common}
            actions={
              <button className="link-btn" onClick={() => setPurchaseFormOpen((o) => !o)}>
                {purchaseFormOpen ? 'Close' : 'Add purchase'}
              </button>
            }
          >
            <PurchasesSection project={project} purchases={d.purchases} setPurchases={S.purchases} onChanged={onChanged} formOpen={purchaseFormOpen} setFormOpen={setPurchaseFormOpen} />
          </Section>
        );
      case 'activity':
        return (
          <Section {...common}>
            <div className="activity">
              <Heatmap byDay={insights.activity_by_day} />
              <ActivityFeed items={insights.recent.slice(0, 6)} showProject={false} />
            </div>
          </Section>
        );
      default:
        return null;
    }
  }

  const menuItems = [
    { label: 'Customize sections…', icon: SlidersHorizontal, onClick: () => setDialog('customize') },
    'divider',
    { label: 'Export as Markdown', icon: Download, href: api.exports.markdownUrl(id), download: '' },
    d.purchases.length > 0 && { label: 'Export purchases (CSV)', icon: Download, href: api.exports.purchasesCsvUrl(id), download: '' },
    'divider',
    project.archived
      ? { label: 'Restore from archive', icon: Archive, onClick: () => setArchived(false) }
      : { label: 'Archive project', icon: Archive, onClick: () => setArchived(true) },
    { label: 'Delete project…', icon: Trash2, onClick: () => setDialog('delete'), danger: true },
  ];

  return (
    <main className="page project-page" style={{ '--project': colorFor(project) }}>
      <nav className="section-nav" aria-label="Sections">
        <a href="#overview" className={activeSection === 'overview' ? 'active' : ''}>
          Overview
        </a>
        {layout.map((key) => (
          <a key={key} href={`#${anchorOf(key)}`} className={activeSection === anchorOf(key) ? 'active' : ''}>
            {BUILTIN_SECTIONS[key]?.label ?? custom[key].title}
          </a>
        ))}
        <button className="section-nav-edit" onClick={() => setDialog('customize')}>
          Customize
        </button>
      </nav>

      <ProjectHeader project={project} stats={stats} save={save} saveState={saveState} menuItems={menuItems} />

      {toRows(layout, sizeOf).map((row) =>
        row.length === 2 ? (
          <div key={row.join()} className="section-pair">
            {row.map((key) => (
              <Fragment key={key}>{renderSection(key)}</Fragment>
            ))}
          </div>
        ) : (
          <Fragment key={row[0]}>{renderSection(row[0])}</Fragment>
        ),
      )}

      <div className="add-section">
        <span className="add-section-label">
          <Plus size={15} aria-hidden /> Add a section
        </span>
        {Object.entries(CUSTOM_KINDS).map(([kind, k]) => (
          <button key={kind} className="chip" onClick={() => addCustom(kind)} title={k.description}>
            <k.icon size={14} aria-hidden /> {k.label}
          </button>
        ))}
        {Object.keys(BUILTIN_SECTIONS)
          .filter((k) => !layout.includes(k))
          .map((k) => {
            const Icon = BUILTIN_SECTIONS[k].icon;
            return (
              <button key={k} className="chip dashed" onClick={() => setLayout([...layout, k])} title={`Show ${BUILTIN_SECTIONS[k].label} again`}>
                <Icon size={14} aria-hidden /> {BUILTIN_SECTIONS[k].label}
              </button>
            );
          })}
      </div>

      {dialog === 'customize' && (
        <CustomizeDialog
          layout={layout}
          sections={sections}
          onLayout={setLayout}
          onAddCustom={addCustom}
          onDeleteCustom={(s) => setDialog({ deleteSection: s })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.deleteSection && (
        <ConfirmDialog
          title="Delete section?"
          message={`“${dialog.deleteSection.title}” and everything in it will be deleted. This can't be undone.`}
          confirmLabel="Delete section"
          onConfirm={() => deleteSection(dialog.deleteSection)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete project?"
          message={`This permanently deletes ${project.name} and everything in it — log entries, tasks, purchases, photos and files. To just put it away, archive it instead.`}
          typeToConfirm={project.name}
          confirmLabel="Delete project"
          onConfirm={async () => {
            await api.projects.remove(project.id);
            globalChanged();
            navigate('/');
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </main>
  );
}
