import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { removeUploadFiles, thumbName } from '../uploads.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Adds the URLs the UI needs, so it never has to know how files are stored.
export const withUrls = (row) =>
  row && {
    ...row,
    url: `/uploads/originals/${row.stored_name}`,
    thumb_url: `/uploads/thumbs/${thumbName(row.stored_name)}`,
  };

export function listPhotos(projectId) {
  return getDb()
    .prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY taken_on DESC, id DESC')
    .all(projectId)
    .map(withUrls);
}

export function listPhotosForEntries(entryIds) {
  if (!entryIds.length) return [];
  return getDb()
    .prepare(`SELECT * FROM photos WHERE log_entry_id IN (${entryIds.map(() => '?').join(',')}) ORDER BY id`)
    .all(...entryIds)
    .map(withUrls);
}

export function getPhoto(id) {
  return withUrls(getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id));
}

function checkEntry(projectId, logEntryId) {
  if (logEntryId == null) return null;
  const entry = getDb().prepare('SELECT project_id FROM log_entries WHERE id = ?').get(logEntryId);
  if (!entry || entry.project_id !== projectId) throw new ValidationError('That log entry is not in this project');
  return logEntryId;
}

export function createPhoto({ projectId, logEntryId = null, storedName, originalName, mime, width, height, caption = '' }) {
  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO photos (project_id, log_entry_id, stored_name, original_name, mime, width, height, caption)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, checkEntry(projectId, logEntryId), storedName, originalName, mime, width, height, caption);
  return getPhoto(lastInsertRowid);
}

export function updatePhoto(id, input) {
  const photo = getPhoto(id);
  const fields = {};
  if ('caption' in input) fields.caption = String(input.caption ?? '');
  if ('taken_on' in input) {
    if (!DATE_RE.test(input.taken_on ?? '')) throw new ValidationError('taken_on must be YYYY-MM-DD');
    fields.taken_on = input.taken_on;
  }
  if ('log_entry_id' in input) fields.log_entry_id = checkEntry(photo.project_id, input.log_entry_id || null);

  const cols = Object.keys(fields);
  if (cols.length) {
    getDb()
      .prepare(
        `UPDATE photos SET ${cols.map((c) => `${c} = @${c}`).join(', ')},
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = @id`,
      )
      .run({ ...fields, id });
  }
  return getPhoto(id);
}

export function deletePhoto(id) {
  const photo = getPhoto(id);
  if (!photo) return false;
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
  removeUploadFiles(photo.stored_name);
  return true;
}
