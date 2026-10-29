import InlineText from '../../components/InlineText.jsx';
import TagEditor from '../../components/TagEditor.jsx';
import { Meter } from '../../components/charts/Charts.jsx';
import { statusClass } from '../../components/StatusBadge.jsx';
import { PROJECT_STATUSES } from '../../constants.js';
import { centsToInput, daysBetween, localDate, money, shortDate } from '../../utils/format.js';
import { timeAgo } from '../../utils/dates.js';

// Elapsed-vs-planned timeline between start and target dates.
function Timeline({ start, target }) {
  if (!start) return <span className="muted">Set a start date</span>;
  const today = localDate();
  const elapsed = Math.max(0, daysBetween(start, today));
  if (!target) return <span>Day {elapsed + 1}</span>;
  const total = Math.max(1, daysBetween(start, target));
  const left = daysBetween(today, target);
  return (
    <span className="timeline">
      <span>
        Day {elapsed + 1} of {total}
        <span className={left < 0 ? 'overdue' : 'muted'}> · {left < 0 ? `${-left} days past target` : `${left} days left`}</span>
      </span>
      <Meter value={elapsed} max={total} warnAt={0.85} label="Time elapsed" />
    </span>
  );
}

// The project header, laid out like a drawing title block.
export default function TitleBlock({ project, stats, save, saveState }) {
  const code = `EPL-${String(project.id).padStart(3, '0')}`;
  return (
    <section id="overview" className="title-block card">
      <a className={`tb-cover ${project.cover ? '' : 'empty'}`} href="#photos" title={project.cover ? 'Change the cover in Photos' : 'Pick a cover in Photos'}>
        {project.cover ? <img src={project.cover.url} alt={project.cover.caption || 'Cover photo'} /> : <span>Pick a cover photo ↓</span>}
      </a>

      <div className="tb-main">
        <div className="tb-eyebrow">
          <span className="mono">{code}</span>
          <span className={`save-state ${saveState && !['saving', 'saved'].includes(saveState) ? 'error' : 'muted'}`}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState}
          </span>
        </div>
        <h1 className="tb-name">
          <InlineText value={project.name} onSave={(name) => save({ name })} required />
        </h1>
        <div className="tb-row">
          <select className={`status-select ${statusClass(project.status)}`} value={project.status} onChange={(e) => save({ status: e.target.value })} aria-label="Status">
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <TagEditor tags={project.tags} onSave={(tags) => save({ tags })} />
        </div>
        <p className="tb-summary">
          <InlineText value={project.summary} onSave={(summary) => save({ summary })} placeholder="One line about what this is…" />
        </p>
        <div className="tb-next">
          <span className="label">Next action</span>
          <InlineText value={project.next_action} onSave={(next_action) => save({ next_action })} placeholder="The very next physical step…" />
        </div>
      </div>

      <dl className="tb-cells">
        <div className="tb-cell span-2 tb-goal">
          <dt>Goal · definition of done</dt>
          <dd>
            <InlineText value={project.goal} onSave={(goal) => save({ goal })} placeholder="What does done look like?" multiline />
          </dd>
        </div>
        <div className="tb-cell">
          <dt>Start</dt>
          <dd>
            <input type="date" className="inline-date" value={project.start_date ?? ''} onChange={(e) => save({ start_date: e.target.value || null })} />
          </dd>
        </div>
        <div className="tb-cell">
          <dt>Target</dt>
          <dd>
            <input type="date" className="inline-date" value={project.target_date ?? ''} onChange={(e) => save({ target_date: e.target.value || null })} />
          </dd>
        </div>
        <div className="tb-cell span-2">
          <dt>Timeline</dt>
          <dd>
            <Timeline start={project.start_date} target={project.target_date} />
          </dd>
        </div>
        <div className="tb-cell">
          <dt>Budget</dt>
          <dd>
            <span className="budget-input">
              $
              <InlineText value={centsToInput(project.budget_cents)} onSave={(v) => save({ budget: v.replace(/[$,\s]/g, '') || null })} placeholder="none" />
            </span>
          </dd>
        </div>
        <div className="tb-cell">
          <dt>Spent</dt>
          <dd className="mono">{money(stats?.spent_cents ?? 0)}</dd>
        </div>
        <div className="tb-cell">
          <dt>Last activity</dt>
          <dd>{stats ? timeAgo(stats.last_activity) : '—'}</dd>
        </div>
        <div className="tb-cell">
          <dt>Created</dt>
          <dd>{shortDate(project.created_at)}</dd>
        </div>
      </dl>
    </section>
  );
}
