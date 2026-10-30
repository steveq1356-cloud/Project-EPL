import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/dates.js';
import { colorFor } from '../utils/projectColor.js';
import CoverArt from './CoverArt.jsx';
import { Meter } from './charts/Charts.jsx';
import { statusClass } from './StatusBadge.jsx';

export default function ProjectCard({ project: p }) {
  const s = p.stats;
  const tasks = s.open_tasks + s.done_tasks;
  return (
    <Link to={`/projects/${p.id}`} className="project-card" style={{ '--project': colorFor(p) }}>
      <div className="card-cover">
        {p.cover ? <img src={p.cover.thumb_url} alt="" loading="lazy" /> : <CoverArt project={p} />}
        <span className={`card-status ${statusClass(p.status)}`}>
          <span className="status-dot" aria-hidden />
          {p.status}
        </span>
      </div>
      <div className="project-card-body">
        <h3>{p.name}</h3>
        {p.next_action ? (
          <p className="card-next">{p.next_action}</p>
        ) : p.summary ? (
          <p className="card-summary">{p.summary}</p>
        ) : (
          <p className="card-summary muted">Add a summary and a next action to get going</p>
        )}
        <div className="card-foot">
          {tasks > 0 ? (
            <span className="card-progress" title={`${s.done_tasks} of ${tasks} tasks done`}>
              <Meter value={s.done_tasks} max={tasks} warnAt={2} label="Tasks done" />
              <span>
                {s.done_tasks}/{tasks}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className={p.stale ? 'stale-text' : ''}>{p.stale ? `Quiet ${s.days_since_activity} days` : timeAgo(s.last_activity)}</span>
        </div>
      </div>
    </Link>
  );
}
