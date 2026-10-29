import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';
import { timeAgo } from '../utils/dates.js';

const KIND = {
  log: { icon: '✎', verb: 'Logged' },
  photos: { icon: '▨', verb: 'Added' },
  purchase: { icon: '$', verb: 'Purchase' },
  task: { icon: '☐', verb: 'New task' },
  task_done: { icon: '☑', verb: 'Done' },
  link: { icon: '↗', verb: 'Linked' },
};

const anchorFor = (a) =>
  ({ log: `#log-${a.id}`, photos: '#photos', purchase: `#purchase-${a.id}`, task: `#task-${a.id}`, task_done: `#task-${a.id}`, link: `#link-${a.id}` })[a.kind] ?? '';

export default function ActivityFeed({ items, showProject = true, empty = 'Nothing yet.' }) {
  if (!items.length) return <p className="muted empty-state small">{empty}</p>;
  return (
    <ol className="feed">
      {items.map((a) => (
        <li key={`${a.kind}-${a.id}`} className={`feed-item feed-${a.kind}`}>
          <span className="feed-icon" aria-hidden>
            {KIND[a.kind]?.icon}
          </span>
          <div className="feed-body">
            <Link to={`/projects/${a.project_id}${anchorFor(a)}`} className="feed-title">
              <span className="muted">{KIND[a.kind]?.verb}</span> {a.title}
            </Link>
            <div className="feed-meta">
              {showProject && <span>{a.project_name}</span>}
              {a.detail && <span>{a.detail}</span>}
              {a.amount_cents != null && <span className="mono">{money(a.amount_cents)}</span>}
              <time dateTime={a.at}>{timeAgo(a.at)}</time>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
