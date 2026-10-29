import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api } from '../api/index.js';
import { PROJECT_TABS } from '../constants.js';
import InlineText from '../components/InlineText.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LogTab from './project/LogTab.jsx';
import OverviewTab from './project/OverviewTab.jsx';
import PhotosTab from './project/PhotosTab.jsx';

const COMING = { purchases: 3, tasks: 3, links: 3 };

export default function ProjectPage() {
  const { id, tab = 'overview' } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved' | error message

  useEffect(() => {
    setProject(null);
    setError(null);
    api.projects.get(id).then(setProject).catch((e) => setError(e.message));
  }, [id]);

  const reloadProject = useCallback(() => {
    api.projects.get(id).then(setProject).catch(() => {});
  }, [id]);

  // Optimistic: show the change immediately, roll back if the server rejects it.
  const save = useCallback(
    async (fields) => {
      const before = project;
      setProject({ ...project, ...fields });
      setSaveState('saving');
      try {
        setProject(await api.projects.update(project.id, fields));
        setSaveState('saved');
      } catch (e) {
        setProject(before);
        setSaveState(e.message);
      }
    },
    [project],
  );

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState(null), 1500);
    return () => clearTimeout(t);
  }, [saveState]);

  useEffect(() => {
    if (project) document.title = `${project.name} · EPL`;
    return () => {
      document.title = 'EPL';
    };
  }, [project?.name]);

  if (error) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <Link to="/">← Back to dashboard</Link>
      </main>
    );
  }
  if (!project) return <main className="page muted">Loading…</main>;

  return (
    <main className="page">
      <nav className="breadcrumb">
        <Link to="/">Dashboard</Link> <span className="muted">/</span>
      </nav>

      <header className="project-header">
        <h1>
          <InlineText value={project.name} onSave={(name) => save({ name })} required />
        </h1>
        <StatusBadge status={project.status} />
        <span className={`save-state ${saveState && !['saving', 'saved'].includes(saveState) ? 'error' : 'muted'}`}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState}
        </span>
      </header>

      <nav className="tabs" role="tablist">
        {PROJECT_TABS.map((t) => (
          <NavLink
            key={t.id}
            to={t.id === 'overview' ? `/projects/${project.id}` : `/projects/${project.id}/${t.id}`}
            end
            role="tab"
            className={() => `tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <section className="tab-panel">
        {tab === 'overview' ? (
          <OverviewTab project={project} save={save} />
        ) : tab === 'log' ? (
          <LogTab project={project} />
        ) : tab === 'photos' ? (
          <PhotosTab project={project} save={save} reloadProject={reloadProject} />
        ) : (
          <p className="muted">The {PROJECT_TABS.find((t) => t.id === tab)?.label ?? tab} tab is coming in Phase {COMING[tab] ?? '?'}.</p>
        )}
      </section>
    </main>
  );
}
