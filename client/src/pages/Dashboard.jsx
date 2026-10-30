import { Coffee, Flame, Plus, SlidersHorizontal, Sparkles, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { DASHBOARD_WIDGETS, PROJECT_STATUSES } from '../constants.js';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { ChartCard, ColumnChart, Heatmap, heatmapTable } from '../components/charts/Charts.jsx';
import { useData } from '../components/DataContext.jsx';
import Modal from '../components/Modal.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useToasts } from '../components/Toasts.jsx';
import { daysBetween, localDate, money, monthLabel, shortDate } from '../utils/format.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// Consecutive days with activity, ending today (or yesterday, so the streak survives
// until you've had a chance to work today).
function streak(byDay) {
  const d = new Date();
  if (!byDay[localDate(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (byDay[localDate(d)]?.total) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function CustomizeDashboard({ hidden, onChange, onClose }) {
  return (
    <Modal title="Customize dashboard" onClose={onClose}>
      <div className="customize">
        <p className="muted small">Choose what shows on the dashboard.</p>
        <ul className="toggle-list">
          {Object.entries(DASHBOARD_WIDGETS).map(([key, label]) => (
            <li key={key}>
              <label>
                <input type="checkbox" checked={!hidden.includes(key)} onChange={(e) => onChange(e.target.checked ? hidden.filter((k) => k !== key) : [...hidden, key])} />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

export default function Dashboard({ onQuickAdd, onNewProject }) {
  const { version, changed, settings, updateSettings } = useData();
  const { notify } = useToasts();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [customizing, setCustomizing] = useState(false);
  const hidden = settings.dashboard_hidden ?? [];
  const show = (key) => !hidden.includes(key);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, [version]);

  useEffect(() => {
    document.title = 'Dashboard · EPL';
  }, []);

  const projects = useMemo(() => {
    if (!data) return [];
    const list = filter === 'All' ? data.projects : data.projects.filter((p) => p.status === filter);
    return [...list].sort((a, b) => PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status) || b.stats.last_activity.localeCompare(a.stats.last_activity));
  }, [data, filter]);

  if (error) return <main className="page"><p className="error">Couldn't load the dashboard: {error}</p></main>;
  if (!data) return <main className="page muted">Loading…</main>;

  const k = data.kpis;
  const monthly = data.spend.months.map((m) => ({ label: monthLabel(m.month).slice(0, 3), title: monthLabel(m.month, { long: true }), value: m.cents, byProject: m.byProject }));
  const statuses = PROJECT_STATUSES.filter((s) => data.projects.some((p) => p.status === s));
  const tasksAhead = [...data.upcoming_tasks, ...data.priority_tasks];
  const today = localDate();

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

  const lower = [show('upnext') && 'upnext', show('recent') && 'recent'].filter(Boolean);
  const days = streak(data.activity_by_day);
  const weekDays = Object.entries(data.activity_by_day).filter(([day, v]) => v.total && daysBetween(day, today) < 7).length;
  const charts = [show('heatmap') && 'heatmap', show('spend') && k.spend_all_time_cents > 0 && 'spend'].filter(Boolean);

  return (
    <main className="page dashboard">
      <header className="page-head">
        <div>
          <h1>{greeting()}</h1>
          <p className="head-sub">
            <span className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            {days >= 2 ? (
              <span className="streak" title="Days in a row with something logged">
                <Flame size={14} aria-hidden /> {days}-day streak
              </span>
            ) : weekDays > 0 ? (
              <span className="streak calm" title="Days with activity in the last week">
                <Sparkles size={14} aria-hidden /> Active {weekDays} of the last 7 days
              </span>
            ) : null}
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal size={15} aria-hidden /> Customize
          </button>
          <button className="btn btn-primary" onClick={onNewProject}>
            <Plus size={15} aria-hidden /> New project
          </button>
        </div>
      </header>

      {show('stats') && (
        <dl className="stat-strip">
          <div>
            <dt>Active projects</dt>
            <dd>{k.active_projects}</dd>
          </div>
          <div>
            <dt>Open tasks</dt>
            <dd>
              {k.open_tasks}
              {k.overdue_tasks > 0 && <span className="stat-note overdue">{k.overdue_tasks} overdue</span>}
            </dd>
          </div>
          <div>
            <dt>Spent this month</dt>
            <dd>{money(k.spend_this_month_cents, { whole: true })}</dd>
          </div>
          <div>
            <dt>Entries, last 30 days</dt>
            <dd>{k.entries_30d}</dd>
          </div>
        </dl>
      )}

      {show('projects') && (
        <section className="dash-block">
          <div className="block-head">
            <h2>Projects</h2>
            {statuses.length > 1 && (
              <div className="filter-tabs" role="group" aria-label="Filter by status">
                {['All', ...statuses].map((s) => (
                  <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="project-grid">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
            <button className="project-card new-card" onClick={onNewProject}>
              <span className="new-card-icon" aria-hidden>
                <Plus size={20} />
              </span>
              New project
            </button>
          </div>
        </section>
      )}

      {lower.length > 0 && (
        <div className={`dash-columns cols-${lower.length}`}>
          {show('upnext') && (
            <section className="dash-block">
              <div className="block-head">
                <h2>Up next</h2>
                <button className="link-btn" onClick={() => onQuickAdd('task')}>
                  Add task
                </button>
              </div>
              <div className="card-plain">
                {tasksAhead.length === 0 && data.in_transit.length === 0 && <EmptyState icon={Coffee} title="Nothing due in the next two weeks" />}
                {tasksAhead.length > 0 && (
                  <ul className="task-list">
                    {tasksAhead.map((t) => {
                      const overdue = t.due_date && t.due_date < today;
                      return (
                        <li key={t.id} className="task-row">
                          <input type="checkbox" checked={false} onChange={() => completeTask(t)} aria-label={`Mark ${t.title} done`} />
                          <Link to={`/projects/${t.project_id}#task-${t.id}`} className="task-title">
                            {t.title}
                          </Link>
                          <span className="task-meta muted small">
                            {t.due_date ? <span className={overdue ? 'overdue' : ''}>{overdue ? 'Overdue · ' : ''}{shortDate(t.due_date)}</span> : <span>High priority</span>}
                            <span>{t.project_name}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {data.in_transit.length > 0 && (
                  <>
                    <div className="group-label">On the way</div>
                    <ul className="task-list">
                      {data.in_transit.map((p) => (
                        <li key={p.id} className="task-row">
                          <span className="transit-icon" aria-hidden>
                            <Truck size={15} />
                          </span>
                          <Link to={`/projects/${p.project_id}#purchase-${p.id}`} className="task-title">
                            {p.item}
                          </Link>
                          <span className="task-meta muted small">
                            <span>{p.project_name}</span>
                            <button className="link-btn" onClick={() => markArrived(p)}>
                              Arrived
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          )}
          {show('recent') && (
            <section className="dash-block">
              <div className="block-head">
                <h2>Recent activity</h2>
              </div>
              <div className="card-plain">
                <ActivityFeed items={data.recent.slice(0, 8)} empty="Nothing logged yet — press N to write your first entry." />
              </div>
            </section>
          )}
        </div>
      )}

      {charts.length > 0 && (
        <div className={`dash-columns cols-${charts.length}`}>
          {charts.includes('heatmap') && (
            <ChartCard title="Activity" subtitle="Last 26 weeks" table={heatmapTable(data.activity_by_day)}>
              <Heatmap byDay={data.activity_by_day} />
            </ChartCard>
          )}
          {charts.includes('spend') && (
            <ChartCard
              title="Spend by month"
              subtitle={`${money(k.spend_all_time_cents, { whole: true })} all-time`}
              table={{ columns: [{ key: 'title', label: 'Month' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) }], rows: monthly }}
            >
              <ColumnChart
                data={monthly}
                height={150}
                format={(v, short) => money(v, { whole: true, compact: short })}
                tooltipRows={(m) => [{ value: money(m.value), label: 'total' }, ...m.byProject.map((b) => ({ value: money(b.cents), label: b.name }))]}
                emptyText="No purchases in the last 12 months"
              />
            </ChartCard>
          )}
        </div>
      )}

      {customizing && <CustomizeDashboard hidden={hidden} onChange={(next) => updateSettings({ dashboard_hidden: next })} onClose={() => setCustomizing(false)} />}
    </main>
  );
}
