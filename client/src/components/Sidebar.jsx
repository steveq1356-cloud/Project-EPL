import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PROJECT_STATUSES } from '../constants.js';
import { useData } from './DataContext.jsx';
import { statusClass } from './StatusBadge.jsx';

export const sidebarOrder = (projects) =>
  projects.filter((p) => !p.archived).sort((a, b) => PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status) || a.name.localeCompare(b.name));

function ProjectLink({ p }) {
  return (
    <NavLink to={`/projects/${p.id}`} className="nav-item project-link" title={p.stale ? `${p.status} · quiet for ${p.stats.days_since_activity} days` : p.status}>
      <span className={`status-dot ${statusClass(p.status)}`} aria-hidden />
      <span className="nav-label">{p.name}</span>
      {p.stale && <span className="stale-dot" aria-label="stale" />}
    </NavLink>
  );
}

// Always-visible project list so any project is one click away.
export default function Sidebar({ onNewProject, onSearch, onQuickAdd, onHelp, theme, onTheme, open, onClose }) {
  const { projects } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const live = sidebarOrder(projects);
  const archived = projects.filter((p) => p.archived);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && onClose()}>
      <NavLink to="/" className="brand" aria-label="Dashboard">
        <span className="brand-mark" aria-hidden>
          EPL
        </span>
        <span className="brand-name">Project Log</span>
      </NavLink>

      <button className="search-trigger" onClick={onSearch}>
        <span>Search</span>
        <kbd>/</kbd>
      </button>

      <nav className="nav">
        <NavLink to="/" end className="nav-item">
          <span className="nav-icon" aria-hidden>
            ⌂
          </span>
          <span className="nav-label">Dashboard</span>
        </NavLink>
        <button className="nav-item" onClick={onQuickAdd}>
          <span className="nav-icon" aria-hidden>
            +
          </span>
          <span className="nav-label">Quick add</span>
          <kbd>N</kbd>
        </button>

        <div className="nav-heading">
          <span>Projects</span>
          <button className="icon-btn small" onClick={onNewProject} title="New project" aria-label="New project">
            +
          </button>
        </div>
        {live.map((p) => (
          <ProjectLink key={p.id} p={p} />
        ))}

        {archived.length > 0 && (
          <>
            <button className="nav-heading as-button" onClick={() => setShowArchived((s) => !s)} aria-expanded={showArchived}>
              <span>Archived</span>
              <span>
                {archived.length} {showArchived ? '▾' : '▸'}
              </span>
            </button>
            {showArchived && archived.map((p) => <ProjectLink key={p.id} p={p} />)}
          </>
        )}
      </nav>

      <footer className="sidebar-footer">
        <button className="link-btn muted-link" onClick={onTheme} title="Theme: system → light → dark">
          {theme === 'dark' ? '☾ Dark' : theme === 'light' ? '☀ Light' : '◐ Auto'}
        </button>
        <button className="link-btn muted-link" onClick={onHelp}>
          Shortcuts
        </button>
      </footer>
    </aside>
  );
}
