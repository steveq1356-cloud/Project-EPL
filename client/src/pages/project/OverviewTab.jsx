import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { PROJECT_STATUSES } from '../../constants.js';
import InlineText from '../../components/InlineText.jsx';
import TagEditor from '../../components/TagEditor.jsx';

export default function OverviewTab({ project, save }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    const typed = window.prompt(
      `Delete "${project.name}" and everything in it (log, purchases, tasks, photos, links)?\n\nThis can't be undone. Type the project name to confirm:`,
    );
    if (typed?.trim() !== project.name) return;
    setDeleting(true);
    await api.projects.remove(project.id);
    navigate('/');
  }

  return (
    <div className="overview">
      {project.cover ? (
        <Link to={`/projects/${project.id}/photos`} className="overview-cover" title="Change in the Photos tab">
          <img src={project.cover.thumb_url} alt={project.cover.caption || 'Cover photo'} />
        </Link>
      ) : (
        <Link to={`/projects/${project.id}/photos`} className="overview-cover empty muted">
          No cover photo — pick one in Photos
        </Link>
      )}

      <dl className="fields">
        <dt>Summary</dt>
        <dd>
          <InlineText value={project.summary} onSave={(summary) => save({ summary })} placeholder="One line about what it is" />
        </dd>

        <dt>Goal</dt>
        <dd>
          <InlineText value={project.goal} onSave={(goal) => save({ goal })} placeholder="What does done look like?" multiline />
        </dd>

        <dt>Next action</dt>
        <dd>
          <InlineText value={project.next_action} onSave={(next_action) => save({ next_action })} placeholder="The very next physical step" />
        </dd>

        <dt>Status</dt>
        <dd>
          <select className="inline-select" value={project.status} onChange={(e) => save({ status: e.target.value })}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </dd>

        <dt>Start date</dt>
        <dd>
          <input type="date" className="inline-date" value={project.start_date ?? ''} onChange={(e) => save({ start_date: e.target.value || null })} />
        </dd>

        <dt>Target date</dt>
        <dd>
          <input type="date" className="inline-date" value={project.target_date ?? ''} onChange={(e) => save({ target_date: e.target.value || null })} />
        </dd>

        <dt>Tags</dt>
        <dd>
          <TagEditor tags={project.tags} onSave={(tags) => save({ tags })} />
        </dd>

        <dt>Created</dt>
        <dd className="muted mono">{new Date(project.created_at).toLocaleString()}</dd>

        <dt>Last edited</dt>
        <dd className="muted mono">{new Date(project.updated_at).toLocaleString()}</dd>
      </dl>

      <section className="danger-zone">
        <button className="btn btn-danger" onClick={remove} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete project'}
        </button>
      </section>
    </div>
  );
}
