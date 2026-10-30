import DateField from '../../components/DateField.jsx';
import InlineText from '../../components/InlineText.jsx';
import Menu from '../../components/Menu.jsx';
import TagEditor from '../../components/TagEditor.jsx';
import { Meter } from '../../components/charts/Charts.jsx';
import { statusClass } from '../../components/StatusBadge.jsx';
import { PROJECT_STATUSES } from '../../constants.js';
import { centsToInput, daysBetween, localDate, money } from '../../utils/format.js';
import { timeAgo } from '../../utils/dates.js';

function timelineText(start, target) {
  if (!start) return null;
  const elapsed = Math.max(0, daysBetween(start, localDate()));
  if (!target) return `Day ${elapsed + 1}`;
  const total = Math.max(1, daysBetween(start, target));
  const left = daysBetween(localDate(), target);
  return left < 0 ? `${-left} days past target` : `Day ${elapsed + 1} of ${total} · ${left} left`;
}

export default function ProjectHeader({ project, stats, save, saveState, menuItems }) {
  const tasksTotal = stats.open_tasks + stats.done_tasks;
  const timeline = timelineText(project.start_date, project.target_date);
  const elapsed = project.start_date && project.target_date ? Math.max(0, daysBetween(project.start_date, localDate())) : 0;
  const span = project.start_date && project.target_date ? Math.max(1, daysBetween(project.start_date, project.target_date)) : 0;

  return (
    <header id="overview" className="project-header">
      {project.cover && (
        <a className="project-banner" href="#photos" title="Change the cover in Photos">
          <img src={project.cover.url} alt={project.cover.caption || ''} />
        </a>
      )}

      <div className="project-title-row">
        <h1>
          <InlineText value={project.name} onSave={(name) => save({ name })} required />
        </h1>
        <label className={`status-pill ${statusClass(project.status)}`} title="Status">
          <span className="status-dot" aria-hidden />
          <select value={project.status} onChange={(e) => save({ status: e.target.value })} aria-label="Status">
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {project.archived && <span className="archived-pill">Archived</span>}
        <span className="spacer" />
        <span className={`save-state ${saveState && !['saving', 'saved'].includes(saveState) ? 'error' : ''}`} aria-live="polite">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState}
        </span>
        <Menu title="Project options" items={menuItems} />
      </div>

      <p className="project-summary">
        <InlineText value={project.summary} onSave={(summary) => save({ summary })} placeholder="Add a one-line summary…" />
      </p>
      <div className="project-goal">
        <span className="muted">Goal</span>
        <InlineText value={project.goal} onSave={(goal) => save({ goal })} placeholder="What does done look like?" multiline />
      </div>
      <TagEditor tags={project.tags} onSave={(tags) => save({ tags })} />

      <div className="next-action">
        <span className="next-label">Next action</span>
        <InlineText value={project.next_action} onSave={(next_action) => save({ next_action })} placeholder="The very next physical step…" />
      </div>

      <dl className="glance">
        <div>
          <dt>Tasks</dt>
          <dd>
            <a href="#tasks">
              {stats.done_tasks} of {tasksTotal} done
            </a>
            {tasksTotal > 0 && <Meter value={stats.done_tasks} max={tasksTotal} warnAt={2} label="Tasks done" />}
          </dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>
            <a href="#purchases">{money(stats.spent_cents, { whole: stats.spent_cents >= 100000 })}</a>
            {project.budget_cents ? <Meter value={stats.spent_cents} max={project.budget_cents} label="Spent of budget" /> : null}
            <span className="muted small budget-input">
              Budget $<InlineText value={centsToInput(project.budget_cents)} onSave={(v) => save({ budget: v.replace(/[$,\s]/g, '') || null })} placeholder="none" />
            </span>
          </dd>
        </div>
        <div>
          <dt>Timeline</dt>
          <dd>
            <span className="date-pair">
              <DateField value={project.start_date} onChange={(v) => save({ start_date: v })} placeholder="Start" label="Start date" />
              <span className="muted">→</span>
              <DateField value={project.target_date} onChange={(v) => save({ target_date: v })} placeholder="Target" label="Target date" />
            </span>
            {span > 0 && <Meter value={elapsed} max={span} warnAt={0.85} label="Time elapsed" />}
            {timeline && <span className="muted small">{timeline}</span>}
          </dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>{timeAgo(stats.last_activity)}</dd>
        </div>
      </dl>
    </header>
  );
}
