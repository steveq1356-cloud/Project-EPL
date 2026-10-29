import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';
import { timeAgo } from '../utils/dates.js';
import { Meter } from './charts/Charts.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function ProjectCard({ project: p }) {
  const s = p.stats;
  const tasks = s.open_tasks + s.done_tasks;
  return (
    <Link to={`/projects/${p.id}`} className={`card project-card ${p.stale ? 'is-stale' : ''}`}>
      <div className={`card-cover ${p.cover ? '' : 'empty'}`}>
        {p.cover ? <img src={p.cover.thumb_url} alt="" loading="lazy" /> : <span>{p.name.slice(0, 2).toUpperCase()}</span>}
        <span className="card-badges">
          <StatusBadge status={p.status} solid />
          {p.stale && <span className="stale-badge" title={`No activity for ${s.days_since_activity} days`}>Stale · {s.days_since_activity}d</span>}
        </span>
      </div>
      <div className="project-card-body">
        <h3>{p.name}</h3>
        {p.summary ? <p className="card-summary">{p.summary}</p> : <p className="card-summary muted">No summary yet</p>}
        {p.next_action && (
          <p className="card-next">
            <span className="label">Next</span>
            {p.next_action}
          </p>
        )}
      </div>
      <dl className="card-stats">
        <div>
          <dt>Spent</dt>
          <dd>{money(s.spent_cents, { whole: true })}</dd>
        </div>
        <div>
          <dt>Tasks</dt>
          <dd>
            {s.done_tasks}/{tasks}
            {tasks > 0 && <Meter value={s.done_tasks} max={tasks} warnAt={2} label="Tasks done" />}
          </dd>
        </div>
        <div>
          <dt>Entries</dt>
          <dd>{s.entry_count}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{timeAgo(s.last_activity)}</dd>
        </div>
      </dl>
    </Link>
  );
}
