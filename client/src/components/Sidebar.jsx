import { Archive, ChevronDown, ChevronRight, Keyboard, LayoutDashboard, Monitor, Moon, Plus, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PROJECT_STATUSES } from '../constants.js';
import { useData } from './DataContext.jsx';
import ProjectAvatar from './ProjectAvatar.jsx';

export const sidebarOrder = (projects) =>
  projects.filter((p) => !p.archived).sort((a, b) => PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status) || a.name.localeCompare(b.name));

function ProjectLink({ p }) {
  return (
    <NavLink to={`/projects/${p.id}`} className="nav-item project-link" title={p.stale ? `${p.status} · quiet for ${p.stats.days_since_activity} days` : p.status}>
      <ProjectAvatar project={p} size="sm" />
      <span className="nav-label">{p.name}</span>
      {p.stale ? <span className="stale-dot" aria-label="stale" /> : p.stats.open_tasks > 0 && <span className="nav-count">{p.stats.open_tasks}</span>}
    </NavLink>
  );
}

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'Auto' };

// Always-visible project list so any project is one click away.
export default function Sidebar({ onNewProject, onSearch, onQuickAdd, onHelp, theme, onTheme, open, onClose }) {
  const { projects } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const live = sidebarOrder(projects);
  const archived = projects.filter((p) => p.archived);
  const ThemeIcon = THEME_ICON[theme] ?? Monitor;

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && onClose()}>
      <NavLink to="/" className="brand" aria-label="Dashboard">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M6 5h12M6 10h12M6 15h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="17.5" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <span className="brand-text">
          <span className="brand-name">Project Log</span>
          <span className="brand-sub">Engineering notebook</span>
        </span>
      </NavLink>

      <button className="search-trigger" onClick={onSearch}>
        <Search size={15} aria-hidden />
        <span>Search</span>
        <kbd>/</kbd>
      </button>

      <nav className="nav">
        <NavLink to="/" end className="nav-item">
          <LayoutDashboard size={16} className="nav-icon" aria-hidden />
          <span className="nav-label">Dashboard</span>
        </NavLink>
        <button className="nav-item" onClick={onQuickAdd}>
          <Plus size={16} className="nav-icon" aria-hidden />
          <span className="nav-label">Quick add</span>
          <kbd>N</kbd>
        </button>

        <div className="nav-heading">
          <span>Projects</span>
          <button className="icon-btn small" onClick={onNewProject} title="New project" aria-label="New project">
            <Plus size={15} />
          </button>
        </div>
        {live.map((p) => (
          <ProjectLink key={p.id} p={p} />
        ))}
        {live.length === 0 && (
          <button className="nav-item muted" onClick={onNewProject}>
            <Plus size={16} className="nav-icon" aria-hidden />
            <span className="nav-label">Create your first project</span>
          </button>
        )}

        {archived.length > 0 && (
          <>
            <button className="nav-heading as-button" onClick={() => setShowArchived((s) => !s)} aria-expanded={showArchived}>
              <span className="nav-heading-label">
                <Archive size={13} aria-hidden /> Archived
              </span>
              <span className="nav-heading-label">
                {archived.length} {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            </button>
            {showArchived && archived.map((p) => <ProjectLink key={p.id} p={p} />)}
          </>
        )}
      </nav>

      <footer className="sidebar-footer">
        <button className="footer-btn" onClick={onTheme} title="Theme: auto → light → dark">
          <ThemeIcon size={15} aria-hidden /> {THEME_LABEL[theme] ?? 'Auto'}
        </button>
        <button className="footer-btn" onClick={onHelp} title="Keyboard shortcuts">
          <Keyboard size={15} aria-hidden /> Shortcuts
        </button>
      </footer>
    </aside>
  );
}
