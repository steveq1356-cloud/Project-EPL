import { getDb } from '../db/connection.js';
import { date, insertRow, NOW_SQL, oneOf, required, updateRow } from './common.js';

export const PRIORITIES = ['Low', 'Medium', 'High'];

function clean(input, { creating }) {
  const out = {};
  if (creating || 'title' in input) out.title = required(input.title, 'Title');
  if ('notes' in input) out.notes = String(input.notes ?? '');
  if ('due_date' in input) out.due_date = date(input.due_date, 'Due date');
  if ('priority' in input) out.priority = oneOf(input.priority, PRIORITIES, 'Priority');
  if ('done' in input) out.done = input.done ? 1 : 0;
  return out;
}

// Open tasks first (high priority, then soonest due), done tasks last (most recent first).
const ORDER = `done ASC,
  CASE WHEN done = 0 THEN CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END END,
  CASE WHEN done = 0 THEN COALESCE(due_date, '9999') END,
  completed_at DESC, id DESC`;

const fromRow = (row) => row && { ...row, done: Boolean(row.done) };

export function listTasks(projectId) {
  return getDb().prepare(`SELECT * FROM tasks WHERE project_id = ? ORDER BY ${ORDER}`).all(projectId).map(fromRow);
}

export function getTask(id) {
  return fromRow(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id));
}

export function createTask(projectId, input) {
  const fields = clean(input, { creating: true });
  const id = insertRow('tasks', { ...fields, project_id: projectId });
  if (fields.done) getDb().prepare(`UPDATE tasks SET completed_at = ${NOW_SQL} WHERE id = ?`).run(id);
  return getTask(id);
}

export function updateTask(id, input) {
  const fields = clean(input, { creating: false });
  const before = getTask(id);
  updateRow('tasks', id, fields);
  if ('done' in fields && Boolean(fields.done) !== before.done) {
    getDb().prepare(`UPDATE tasks SET completed_at = ${fields.done ? NOW_SQL : 'NULL'} WHERE id = ?`).run(id);
  }
  return getTask(id);
}

export function deleteTask(id) {
  return getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
}

// Open tasks across all projects that are overdue or due within `days`.
export function upcomingTasks(days = 14) {
  return getDb()
    .prepare(
      `SELECT t.*, p.name AS project_name FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE t.done = 0 AND t.due_date IS NOT NULL AND t.due_date <= date('now', 'localtime', ?)
       ORDER BY t.due_date, CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END`,
    )
    .all(`+${days} days`)
    .map(fromRow);
}

// High-priority open tasks without a due date, so they don't get lost.
export function highPriorityUndated(limit = 8) {
  return getDb()
    .prepare(
      `SELECT t.*, p.name AS project_name FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE t.done = 0 AND t.due_date IS NULL AND t.priority = 'High'
       ORDER BY t.created_at DESC LIMIT ?`,
    )
    .all(limit)
    .map(fromRow);
}
