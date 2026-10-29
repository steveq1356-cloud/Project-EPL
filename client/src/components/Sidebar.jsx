import { NavLink } from 'react-router-dom';
import { PROJECT_STATUSES } from '../constants.js';
import { useData } from './DataContext.jsx';
import { statusClass } from './StatusBadge.jsx';

// Always-visible project list so any project is one click away.
export default function Sidebar({ onNewProject, onSearch, onQuickAdd, onHelp, theme, onTheme, open, onClose }) {
  const { projects } = useData();
  const groups = PROJECT_STATUSES.map((status) => ({ status, items: projects.filter((p) => p.status === status) })).filter((g) => g.items.length);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && onClose()}>
      <div className="sidebar-brand">
        <NavLink to="/" className="brand-mark" aria-label="Dashboard">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
            <rect width="32" height="32" rx="6" className="brand-bg" />
            <path d="M8 9h16M8 16h16M8 23h10" className="brand-lines" />
          </svg>
          <span>
            <strong>EPL</strong>
            <small>Engineering Project Log</small>
          </span>
        </NavLink>
      </div>

      <div className="sidebar-actions">
        <button className="sidebar-search" onClick={onSearch}>
          <span>Search…</span>
          <kbd>/</kbd>
        </button>
        <button className="btn btn-primary sidebar-add" onClick={onQuickAdd}>
          + Quick add <kbd>N</kbd>
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          <span className="sidebar-icon" aria-hidden>▦</span> Dashboard
        </NavLink>

        {groups.map((g) => (
          <div key={g.status} className="sidebar-group">
            <div className="sidebar-group-label">
              {g.status} <span>{g.items.length}</span>
            </div>
            {g.items.map((p) => (
              <NavLink key={p.id} to={`/projects/${p.id}`} className="sidebar-link project-link">
                <span className={`status-dot ${statusClass(p.status)}`} aria-hidden />
                <span className="sidebar-project-name">{p.name}</span>
                {p.stale && (
                  <span className="stale-mark" title={`No activity for ${p.stats.days_since_activity} days`}>
                    stale
                  </span>
                )}
                {p.stats.open_tasks > 0 && !p.stale && <span className="sidebar-count">{p.stats.open_tasks}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <button className="sidebar-link sidebar-new" onClick={onNewProject}>
          <span className="sidebar-icon" aria-hidden>+</span> New project
        </button>
      </nav>

      <footer className="sidebar-footer">
        <button className="link-btn" onClick={onTheme} title="Switch theme (system → light → dark)">
          Theme: {theme}
        </button>
        <button className="link-btn" onClick={onHelp}>
          Shortcuts <kbd>?</kbd>
        </button>
      </footer>
    </aside>
  );
}
