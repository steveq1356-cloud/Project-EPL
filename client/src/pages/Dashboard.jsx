import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { PROJECT_STATUSES } from '../constants.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { BarList, ChartCard, ColumnChart, Heatmap, heatmapTable, StatTile } from '../components/charts/Charts.jsx';
import { useData } from '../components/DataContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useToasts } from '../components/Toasts.jsx';
import { localDate, money, monthLabel, plural, shortDate } from '../utils/format.js';

const SORTS = {
  activity: { label: 'Last activity', fn: (a, b) => b.stats.last_activity.localeCompare(a.stats.last_activity) },
  status: { label: 'Status', fn: (a, b) => PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status) || a.name.localeCompare(b.name) },
  name: { label: 'Name', fn: (a, b) => a.name.localeCompare(b.name) },
  spend: { label: 'Spend', fn: (a, b) => b.stats.spent_cents - a.stats.spent_cents },
};

function pctDelta(now, before) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

export default function Dashboard({ onQuickAdd, onNewProject }) {
  const { version, changed } = useData();
  const { notify } = useToasts();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('activity');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, [version]);

  useEffect(() => {
    document.title = 'Dashboard · EPL';
  }, []);

  const projects = useMemo(() => {
    if (!data) return [];
    const list = filter === 'All' ? data.projects : data.projects.filter((p) => p.status === filter);
    return [...list].sort(SORTS[sort].fn);
  }, [data, filter, sort]);

  if (error) return <main className="page"><p className="error">Couldn't load the dashboard: {error}</p></main>;
  if (!data) return <main className="page muted">Loading…</main>;

  const k = data.kpis;
  const monthly = data.spend.months.map((m) => ({ label: monthLabel(m.month).slice(0, 3), title: monthLabel(m.month, { long: true }), value: m.cents, byProject: m.byProject }));
  const byProject = data.projects
    .filter((p) => p.stats.spent_cents > 0)
    .map((p) => ({ id: p.id, label: p.name, value: p.stats.spent_cents }))
    .sort((a, b) => b.value - a.value);
  const statusCounts = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, data.projects.filter((p) => p.status === s).length]));
  const tasksAhead = [...data.upcoming_tasks, ...data.priority_tasks];

  async function completeTask(task) {
    await api.tasks.update(task.id, { done: true });
    notify(`Done: ${task.title}`);
    changed();
  }

  async function markArrived(p) {
    await api.purchases.update(p.id, { status: 'Arrived' });
    notify(`${p.item} arrived`);
    changed();
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <main className="page dashboard">
      <header className="page-head">
        <div>
          <p className="eyebrow">Engineering Project Log · {today}</p>
          <h1>Dashboard</h1>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => onQuickAdd('log')}>
            + Log entry
          </button>
          <button className="btn" onClick={() => onQuickAdd('purchase')}>
            + Purchase
          </button>
          <button className="btn" onClick={() => onQuickAdd('task')}>
            + Task
          </button>
          <button className="btn btn-primary" onClick={onNewProject}>
            + Project
          </button>
        </div>
      </header>

      <div className="kpi-row">
        <StatTile label="Active projects" value={k.active_projects} sub={k.stale_projects ? `${k.stale_projects} stale (21+ days quiet)` : `${data.projects.length} total`} />
        <StatTile
          label="Spent this month"
          value={money(k.spend_this_month_cents, { whole: true })}
          delta={pctDelta(k.spend_this_month_cents, k.spend_last_month_cents)}
          deltaGood={false}
          sub={k.spend_last_month_cents ? `vs ${money(k.spend_last_month_cents, { whole: true })} last month` : 'Ordered + arrived'}
        />
        <StatTile label="Spent all-time" value={money(k.spend_all_time_cents, { whole: true })} sub={`across ${plural(byProject.length, 'project')}`} />
        <StatTile label="Open tasks" value={k.open_tasks} sub={k.overdue_tasks ? `${k.overdue_tasks} overdue` : `${k.done_30d} done in 30 days`} />
        <StatTile
          label="Log entries · 30 days"
          value={k.entries_30d}
          delta={k.entries_30d !== k.entries_prev_30d ? `${k.entries_30d > k.entries_prev_30d ? '+' : '−'}${Math.abs(k.entries_30d - k.entries_prev_30d)}` : null}
          sub={`vs prior 30 days · ${k.entries_total} entries, ${k.photos_total} photos total`}
        />
      </div>

      <div className="dash-grid two">
        <ChartCard
          title="Spend by month"
          subtitle="Ordered + arrived purchases, last 12 months"
          table={{
            columns: [
              { key: 'title', label: 'Month' },
              { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) },
            ],
            rows: monthly,
          }}
        >
          <ColumnChart
            data={monthly}
            emptyText="No purchases in the last 12 months — press P to log one"
            format={(v, short) => money(v, { whole: true, compact: short })}
            tooltipRows={(d) => [{ value: money(d.value), label: 'total' }, ...d.byProject.map((b) => ({ value: money(b.cents), label: b.name }))]}
          />
        </ChartCard>
        <ChartCard title="Activity" subtitle="Log entries, photos, purchases and finished tasks per day" table={heatmapTable(data.activity_by_day)}>
          <Heatmap byDay={data.activity_by_day} />
        </ChartCard>
      </div>

      <section className="dash-section">
        <div className="section-head">
          <h2>
            <span className="section-num">01</span> Projects
          </h2>
          <div className="filter-row">
            <div className="filter-chips" role="group" aria-label="Filter by status">
              {['All', ...PROJECT_STATUSES].map((s) =>
                s === 'All' || statusCounts[s] ? (
                  <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                    {s} <span className="muted">{s === 'All' ? data.projects.length : statusCounts[s]}</span>
                  </button>
                ) : null,
              )}
            </div>
            <label className="sort-select">
              <span className="label">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <button className="card project-card new-card" onClick={onNewProject}>
            <span>+ New project</span>
          </button>
        </div>
      </section>

      <div className="dash-grid three">
        <section className="card panel">
          <header className="panel-head">
            <h3>Recent activity</h3>
          </header>
          <ActivityFeed items={data.recent} empty="Nothing logged yet — press N to write your first entry." />
        </section>

        <section className="card panel">
          <header className="panel-head">
            <h3>Up next</h3>
            <span className="muted small">Due in 14 days · high priority</span>
          </header>
          {tasksAhead.length === 0 ? (
            <p className="muted empty-state small">No tasks due soon. Press T to add one.</p>
          ) : (
            <ul className="task-list compact">
              {tasksAhead.map((t) => {
                const overdue = t.due_date && t.due_date < localDate();
                return (
                  <li key={t.id} className="task-row">
                    <input type="checkbox" checked={false} onChange={() => completeTask(t)} aria-label={`Mark ${t.title} done`} />
                    <Link to={`/projects/${t.project_id}#task-${t.id}`} className="task-title">
                      {t.title}
                    </Link>
                    <span className="task-meta">
                      <span className={`priority-dot p-${t.priority.toLowerCase()}`} title={`${t.priority} priority`} />
                      {t.due_date && <span className={`due ${overdue ? 'overdue' : ''}`}>{overdue ? 'Overdue · ' : ''}{shortDate(t.due_date)}</span>}
                      <span className="muted">{t.project_name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="stack">
          <section className="card panel">
            <header className="panel-head">
              <h3>In transit</h3>
              <span className="muted small">{plural(data.in_transit.length, 'order')}</span>
            </header>
            {data.in_transit.length === 0 ? (
              <p className="muted empty-state small">Nothing on the way.</p>
            ) : (
              <ul className="transit-list">
                {data.in_transit.map((p) => (
                  <li key={p.id}>
                    <div>
                      <Link to={`/projects/${p.project_id}#purchase-${p.id}`}>{p.item}</Link>
                      <div className="muted small">
                        {p.vendor || 'No vendor'} · {p.project_name} · ordered {shortDate(p.date_ordered)}
                      </div>
                    </div>
                    <button className="btn btn-small" onClick={() => markArrived(p)}>
                      Arrived
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <ChartCard
            title="Spend by project"
            subtitle="All-time"
            table={{ columns: [{ key: 'label', label: 'Project' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) }], rows: byProject }}
          >
            {byProject.length ? (
              <BarList items={byProject} format={(v, short) => money(v, { whole: true, compact: short })} onSelect={(r) => navigate(`/projects/${r.id}#purchases`)} />
            ) : (
              <p className="muted empty-state small">No purchases yet.</p>
            )}
          </ChartCard>
        </div>
      </div>
    </main>
  );
}
