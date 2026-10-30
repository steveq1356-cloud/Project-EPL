import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/dates.js';
import { statusClass } from './StatusBadge.jsx';

export default function ProjectCard({ project: p }) {
  const s = p.stats;
  const tasks = s.open_tasks + s.done_tasks;
  return (
    <Link to={`/projects/${p.id}`} className="project-card">
      <div className={`card-cover ${p.cover ? '' : 'empty'}`}>
        {p.cover ? <img src={p.cover.thumb_url} alt="" loading="lazy" /> : <span>{p.name.slice(0, 1)}</span>}
      </div>
      <div className="project-card-body">
        <div className="project-card-title">
          <h3>{p.name}</h3>
          <span className={`status-text ${statusClass(p.status)}`}>
            <span className="status-dot" aria-hidden />
            {p.status}
          </span>
        </div>
        {p.next_action ? <p className="card-next">{p.next_action}</p> : p.summary ? <p className="card-summary">{p.summary}</p> : <p className="card-summary muted">No summary yet</p>}
        <p className="card-meta">
          {tasks > 0 && <span>{s.open_tasks} open tasks</span>}
          <span className={p.stale ? 'stale-text' : ''}>{p.stale ? `Quiet ${s.days_since_activity} days` : `Updated ${timeAgo(s.last_activity)}`}</span>
        </p>
      </div>
    </Link>
  );
}
