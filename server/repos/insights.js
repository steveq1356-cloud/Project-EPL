// Read-only aggregates for dashboards, charts, the activity feed and search.
import { getDb } from '../db/connection.js';
import { listProjects } from './projects.js';
import { highPriorityUndated, upcomingTasks } from './tasks.js';

const STALE_DAYS = 21;
const SPENT = "('Ordered', 'Arrived')";

// Per-project counts, totals and the most recent change to anything in the project.
export function projectStats() {
  const rows = getDb()
    .prepare(
      `SELECT p.id,
        (SELECT COALESCE(SUM(total_cents), 0) FROM purchases WHERE project_id = p.id AND status IN ${SPENT}) AS spent_cents,
        (SELECT COALESCE(SUM(total_cents), 0) FROM purchases WHERE project_id = p.id AND status = 'Planned') AS planned_cents,
        (SELECT COUNT(*) FROM purchases WHERE project_id = p.id) AS purchase_count,
        (SELECT COUNT(*) FROM purchases WHERE project_id = p.id AND status = 'Ordered') AS in_transit,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND done = 0) AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND done = 1) AS done_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND done = 0 AND due_date < date('now', 'localtime')) AS overdue_tasks,
        (SELECT COUNT(*) FROM log_entries WHERE project_id = p.id) AS entry_count,
        (SELECT COUNT(*) FROM photos WHERE project_id = p.id) AS photo_count,
        (SELECT COUNT(*) FROM links WHERE project_id = p.id) AS link_count,
        (SELECT MAX(timestamp) FROM log_entries WHERE project_id = p.id) AS last_entry_at,
        MAX(p.updated_at,
          COALESCE((SELECT MAX(MAX(updated_at, timestamp)) FROM log_entries WHERE project_id = p.id), ''),
          COALESCE((SELECT MAX(updated_at) FROM photos WHERE project_id = p.id), ''),
          COALESCE((SELECT MAX(updated_at) FROM purchases WHERE project_id = p.id), ''),
          COALESCE((SELECT MAX(updated_at) FROM tasks WHERE project_id = p.id), ''),
          COALESCE((SELECT MAX(updated_at) FROM links WHERE project_id = p.id), '')
        ) AS last_activity
      FROM projects p`,
    )
    .all();

  const now = Date.now();
  return Object.fromEntries(
    rows.map((r) => [r.id, { ...r, days_since_activity: Math.floor((now - new Date(r.last_activity).getTime()) / 86400000) }]),
  );
}

export function projectsWithStats() {
  const stats = projectStats();
  return listProjects().map((p) => {
    const s = stats[p.id];
    return { ...p, stats: s, stale: p.status === 'Active' && s.days_since_activity >= STALE_DAYS };
  });
}

// Recent things that happened, newest first. Photos uploaded together are grouped.
export function activity({ projectId = null, limit = 30 } = {}) {
  const where = projectId ? 'WHERE project_id = @projectId' : '';
  const and = projectId ? 'AND project_id = @projectId' : '';
  return getDb()
    .prepare(
      `SELECT a.*, p.name AS project_name FROM (
        SELECT 'log' AS kind, id, project_id, timestamp AS at, title, type AS detail, NULL AS amount_cents FROM log_entries ${where}
        UNION ALL
        SELECT 'photos', MIN(id), project_id, MAX(created_at), COUNT(*) || CASE COUNT(*) WHEN 1 THEN ' photo' ELSE ' photos' END, NULL, NULL
          FROM photos ${where} GROUP BY project_id, substr(created_at, 1, 13)
        UNION ALL
        SELECT 'purchase', id, project_id, created_at, item, status, total_cents FROM purchases ${where}
        UNION ALL
        SELECT 'task_done', id, project_id, completed_at, title, priority, NULL FROM tasks WHERE done = 1 AND completed_at IS NOT NULL ${and}
        UNION ALL
        SELECT 'task', id, project_id, created_at, title, priority, NULL FROM tasks ${where}
        UNION ALL
        SELECT 'link', id, project_id, created_at, label, category, NULL FROM links ${where}
      ) a JOIN projects p ON p.id = a.project_id
      ORDER BY a.at DESC LIMIT @limit`,
    )
    .all({ projectId, limit });
}

// Activity per local day over the last `days`, broken down by kind (for the heatmap).
export function activityByDay({ projectId = null, days = 182 } = {}) {
  const and = projectId ? 'AND project_id = @projectId' : '';
  const rows = getDb()
    .prepare(
      `SELECT day, kind, COUNT(*) AS n FROM (
        SELECT date(timestamp, 'localtime') AS day, 'log' AS kind FROM log_entries WHERE 1 ${and}
        UNION ALL SELECT taken_on, 'photo' FROM photos WHERE 1 ${and}
        UNION ALL SELECT date_ordered, 'purchase' FROM purchases WHERE date_ordered IS NOT NULL ${and}
        UNION ALL SELECT date(completed_at, 'localtime'), 'task' FROM tasks WHERE completed_at IS NOT NULL ${and}
      ) WHERE day >= date('now', 'localtime', @since)
      GROUP BY day, kind`,
    )
    .all({ projectId, since: `-${days - 1} days` });

  const byDay = {};
  for (const r of rows) {
    byDay[r.day] ??= { total: 0 };
    byDay[r.day][r.kind] = r.n;
    byDay[r.day].total += r.n;
  }
  return byDay;
}

// Money spent per month (Ordered + Arrived), for the last `months` months, split by project.
export function spendByMonth({ projectId = null, months = 12 } = {}) {
  const and = projectId ? 'AND pu.project_id = @projectId' : '';
  const rows = getDb()
    .prepare(
      `SELECT substr(COALESCE(pu.date_ordered, pu.created_at), 1, 7) AS month, pu.project_id, p.name AS project_name,
              SUM(pu.total_cents) AS cents
       FROM purchases pu JOIN projects p ON p.id = pu.project_id
       WHERE pu.status IN ${SPENT} ${and}
       GROUP BY month, pu.project_id ORDER BY month`,
    )
    .all({ projectId });

  // A continuous run of months ending this month, so empty months show as zero.
  const out = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (months - 1));
  for (let i = 0; i < months; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const inMonth = rows.filter((r) => r.month === key);
    out.push({
      month: key,
      cents: inMonth.reduce((sum, r) => sum + r.cents, 0),
      byProject: inMonth.map((r) => ({ project_id: r.project_id, name: r.project_name, cents: r.cents })),
    });
    d.setMonth(d.getMonth() + 1);
  }
  const before = rows.filter((r) => r.month < out[0].month).reduce((sum, r) => sum + r.cents, 0);
  return { months: out, before_cents: before };
}

export function inTransit() {
  return getDb()
    .prepare(
      `SELECT pu.*, p.name AS project_name FROM purchases pu JOIN projects p ON p.id = pu.project_id
       WHERE pu.status = 'Ordered' ORDER BY pu.date_ordered`,
    )
    .all();
}

export function dashboard() {
  const db = getDb();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const projects = projectsWithStats();
  const spend = spendByMonth({ months: 12 });
  const allTime = db.prepare(`SELECT COALESCE(SUM(total_cents), 0) AS c FROM purchases WHERE status IN ${SPENT}`).get().c;
  const monthSpend = spend.months.find((m) => m.month === thisMonth)?.cents ?? 0;
  const lastMonthSpend = spend.months.at(-2)?.cents ?? 0;
  const counts = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM tasks WHERE done = 0) AS open_tasks,
        (SELECT COUNT(*) FROM tasks WHERE done = 0 AND due_date < date('now', 'localtime')) AS overdue_tasks,
        (SELECT COUNT(*) FROM tasks WHERE done = 1 AND completed_at >= datetime('now', '-30 days')) AS done_30d,
        (SELECT COUNT(*) FROM log_entries WHERE timestamp >= datetime('now', '-30 days')) AS entries_30d,
        (SELECT COUNT(*) FROM log_entries WHERE timestamp >= datetime('now', '-60 days') AND timestamp < datetime('now', '-30 days')) AS entries_prev_30d,
        (SELECT COUNT(*) FROM log_entries) AS entries_total,
        (SELECT COUNT(*) FROM photos) AS photos_total`,
    )
    .get();

  return {
    kpis: {
      ...counts,
      active_projects: projects.filter((p) => p.status === 'Active').length,
      stale_projects: projects.filter((p) => p.stale).length,
      spend_this_month_cents: monthSpend,
      spend_last_month_cents: lastMonthSpend,
      spend_all_time_cents: allTime,
    },
    projects,
    spend,
    activity_by_day: activityByDay({ days: 182 }),
    recent: activity({ limit: 25 }),
    upcoming_tasks: upcomingTasks(14),
    priority_tasks: highPriorityUndated(8),
    in_transit: inTransit(),
  };
}

// ---- search ----

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => '\\' + c);

// Every whitespace-separated term must appear somewhere in `haystack` (case-insensitive).
function matchSql(haystack, terms) {
  return terms.map((_, i) => `(${haystack}) LIKE @t${i} ESCAPE '\\'`).join(' AND ');
}

function snippet(raw, terms, radius = 70) {
  if (!raw) return '';
  // Plain text: drop Markdown punctuation (bold, code, tables, headings, task boxes).
  const text = raw
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, ''))
    .replace(/\[[ x]\]/g, '')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/-{3,}/g, ' ');
  const lower = text.toLowerCase();
  const at = Math.max(0, Math.min(...terms.map((t) => lower.indexOf(t.toLowerCase())).filter((i) => i >= 0)));
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius * 2);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '');
}

const SEARCHES = [
  {
    kind: 'project',
    sql: (m) => `SELECT id, id AS project_id, name AS title, summary || ' ' || goal || ' ' || next_action AS body, updated_at AS at
                 FROM projects WHERE ${m("name || ' ' || summary || ' ' || goal || ' ' || next_action || ' ' || tags")}`,
  },
  {
    kind: 'log',
    sql: (m) => `SELECT id, project_id, title, body, type AS detail, timestamp AS at FROM log_entries WHERE ${m("title || ' ' || body || ' ' || type")}`,
  },
  {
    kind: 'purchase',
    sql: (m) => `SELECT id, project_id, item AS title, vendor || ' · ' || category || ' · ' || notes AS body, status AS detail,
                 total_cents, COALESCE(date_ordered, created_at) AS at
                 FROM purchases WHERE ${m("item || ' ' || vendor || ' ' || category || ' ' || notes || ' ' || link")}`,
  },
  {
    kind: 'task',
    sql: (m) => `SELECT id, project_id, title, notes AS body, CASE done WHEN 1 THEN 'Done' ELSE priority END AS detail, created_at AS at
                 FROM tasks WHERE ${m("title || ' ' || notes")}`,
  },
  {
    kind: 'link',
    sql: (m) => `SELECT id, project_id, label AS title, url || ' ' || notes AS body, category AS detail, created_at AS at
                 FROM links WHERE ${m("label || ' ' || url || ' ' || notes || ' ' || category")}`,
  },
  {
    kind: 'photo',
    sql: (m) => `SELECT id, project_id, COALESCE(NULLIF(caption, ''), original_name) AS title, '' AS body, taken_on AS at, stored_name
                 FROM photos WHERE ${m("caption || ' ' || original_name")}`,
  },
];

export function search(q, { limit = 12 } = {}) {
  const terms = String(q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!terms.length) return [];
  const params = Object.fromEntries(terms.map((t, i) => [`t${i}`, `%${escapeLike(t)}%`]));
  const names = Object.fromEntries(getDb().prepare('SELECT id, name FROM projects').all().map((p) => [p.id, p.name]));

  return SEARCHES.flatMap(({ kind, sql }) =>
    getDb()
      .prepare(`${sql((h) => matchSql(h, terms))} ORDER BY at DESC LIMIT ${limit}`)
      .all(params)
      .map((r) => ({ ...r, kind, project_name: names[r.project_id], snippet: snippet(r.body, terms) })),
  );
}
