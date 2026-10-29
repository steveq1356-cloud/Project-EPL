import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { removeUploadFiles } from '../uploads.js';
import { getPhoto } from './photos.js';

export const PROJECT_STATUSES = ['Idea', 'Active', 'On Hold', 'Done', 'Abandoned'];

const EDITABLE = ['name', 'summary', 'goal', 'status', 'start_date', 'target_date', 'next_action', 'tags', 'cover_photo_id'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fromRow = (row) =>
  row && {
    ...row,
    tags: JSON.parse(row.tags),
    cover: row.cover_photo_id ? getPhoto(row.cover_photo_id) : null,
  };

// Checks and normalizes the fields a client sent; unknown fields are ignored.
function clean(input, { creating, id }) {
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in input)) continue;
    let value = input[key];

    if (key === 'name') {
      value = String(value ?? '').trim();
      if (!value) throw new ValidationError('Project name is required');
    } else if (key === 'status') {
      if (!PROJECT_STATUSES.includes(value)) throw new ValidationError(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`);
    } else if (key === 'start_date' || key === 'target_date') {
      value = value || null;
      if (value && !DATE_RE.test(value)) throw new ValidationError(`${key} must be YYYY-MM-DD`);
    } else if (key === 'tags') {
      if (!Array.isArray(value)) throw new ValidationError('tags must be a list');
      const seen = new Set();
      value = value
        .map((t) => String(t).trim())
        .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
      value = JSON.stringify(value);
    } else if (key === 'cover_photo_id') {
      value = value || null;
      if (value && getPhoto(value)?.project_id !== id) throw new ValidationError('Cover photo must be one of this project’s photos');
    } else {
      value = String(value ?? '');
    }
    out[key] = value;
  }
  if (creating && !out.name) throw new ValidationError('Project name is required');
  return out;
}

export function listProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY name COLLATE NOCASE').all().map(fromRow);
}

export function getProject(id) {
  return fromRow(getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id));
}

export function createProject(input) {
  const fields = clean(input, { creating: true });
  const cols = Object.keys(fields);
  const { lastInsertRowid } = getDb()
    .prepare(`INSERT INTO projects (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
    .run(fields);
  return getProject(lastInsertRowid);
}

export function updateProject(id, input) {
  const fields = clean(input, { creating: false, id });
  const cols = Object.keys(fields);
  if (cols.length) {
    getDb()
      .prepare(
        `UPDATE projects SET ${cols.map((c) => `${c} = @${c}`).join(', ')},
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = @id`,
      )
      .run({ ...fields, id });
  }
  return getProject(id);
}

// Deletes the project, everything in it (via ON DELETE CASCADE), and its uploaded files.
export function deleteProject(id) {
  const db = getDb();
  const files = db
    .prepare('SELECT stored_name FROM photos WHERE project_id = ? UNION ALL SELECT stored_name FROM attachments WHERE project_id = ?')
    .all(id, id);
  const deleted = db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0;
  if (deleted) files.forEach((f) => removeUploadFiles(f.stored_name));
  return deleted;
}

export function listTags() {
  return getDb()
    .prepare('SELECT DISTINCT value AS tag FROM projects, json_each(projects.tags) ORDER BY value COLLATE NOCASE')
    .all()
    .map((r) => r.tag);
}
