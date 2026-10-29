import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { listPhotosForEntries } from './photos.js';

export const LOG_TYPES = ['Note', 'Decision', 'Problem', 'Test', 'Idea', 'Milestone'];

function clean(input, { creating }) {
  const out = {};
  if ('title' in input || creating) {
    out.title = String(input.title ?? '').trim();
    if (!out.title) throw new ValidationError('Title is required');
  }
  if ('body' in input) out.body = String(input.body ?? '');
  if ('type' in input) {
    if (!LOG_TYPES.includes(input.type)) throw new ValidationError(`Type must be one of: ${LOG_TYPES.join(', ')}`);
    out.type = input.type;
  }
  if ('timestamp' in input && input.timestamp) {
    const t = new Date(input.timestamp);
    if (Number.isNaN(t.getTime())) throw new ValidationError('timestamp is not a valid date');
    out.timestamp = t.toISOString();
  }
  return out;
}

// Attaches each entry's photos in one query instead of one per entry.
function withPhotos(entries) {
  const photos = listPhotosForEntries(entries.map((e) => e.id));
  return entries.map((e) => ({ ...e, photos: photos.filter((p) => p.log_entry_id === e.id) }));
}

export function listLogEntries(projectId) {
  const rows = getDb()
    .prepare('SELECT * FROM log_entries WHERE project_id = ? ORDER BY timestamp DESC, id DESC')
    .all(projectId);
  return withPhotos(rows);
}

export function getLogEntry(id) {
  const row = getDb().prepare('SELECT * FROM log_entries WHERE id = ?').get(id);
  return row && withPhotos([row])[0];
}

export function createLogEntry(projectId, input) {
  const fields = { ...clean(input, { creating: true }), project_id: projectId };
  const cols = Object.keys(fields);
  const { lastInsertRowid } = getDb()
    .prepare(`INSERT INTO log_entries (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
    .run(fields);
  return getLogEntry(lastInsertRowid);
}

export function updateLogEntry(id, input) {
  const fields = clean(input, { creating: false });
  const cols = Object.keys(fields);
  if (cols.length) {
    getDb()
      .prepare(
        `UPDATE log_entries SET ${cols.map((c) => `${c} = @${c}`).join(', ')},
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = @id`,
      )
      .run({ ...fields, id });
  }
  return getLogEntry(id);
}

// The entry's photos stay in the project's Photos tab (log_entry_id is set to NULL).
export function deleteLogEntry(id) {
  return getDb().prepare('DELETE FROM log_entries WHERE id = ?').run(id).changes > 0;
}
