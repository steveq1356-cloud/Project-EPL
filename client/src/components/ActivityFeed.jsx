import { CircleCheck, Image, Link2, ListTodo, NotebookPen, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';
import { timeAgo } from '../utils/dates.js';

const KIND = {
  log: { icon: NotebookPen, verb: 'Logged' },
  photos: { icon: Image, verb: 'Added' },
  purchase: { icon: ShoppingCart, verb: 'Bought' },
  task: { icon: ListTodo, verb: 'New task' },
  task_done: { icon: CircleCheck, verb: 'Done' },
  link: { icon: Link2, verb: 'Linked' },
};

const anchorFor = (a) =>
  ({ log: `#log-${a.id}`, photos: '#photos', purchase: `#purchase-${a.id}`, task: `#task-${a.id}`, task_done: `#task-${a.id}`, link: `#link-${a.id}` })[a.kind] ?? '';

export default function ActivityFeed({ items, showProject = true, empty = 'Nothing yet.' }) {
  if (!items.length) return <p className="feed-empty">{empty}</p>;
  return (
    <ol className="feed">
      {items.map((a) => {
        const Icon = KIND[a.kind]?.icon ?? NotebookPen;
        return (
          <li key={`${a.kind}-${a.id}`} className={`feed-item feed-${a.kind}`}>
            <span className="feed-icon" aria-hidden>
              <Icon size={13} strokeWidth={2} />
            </span>
            <div className="feed-body">
              <Link to={`/projects/${a.project_id}${anchorFor(a)}`} className="feed-title">
                <span className="muted">{KIND[a.kind]?.verb}</span> {a.title}
              </Link>
              <div className="feed-meta">
                {showProject && <span>{a.project_name}</span>}
                {a.amount_cents != null && <span>{money(a.amount_cents)}</span>}
                <time dateTime={a.at}>{timeAgo(a.at)}</time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
