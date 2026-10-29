import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { deleteAttachment, getAttachment } from './attachments.js';
import { insertRow, oneOf, required, updateRow } from './common.js';

export const LINK_CATEGORIES = ['CAD', 'Code', 'Datasheet', 'Reference'];

function clean(input, { creating }) {
  const out = {};
  if (creating || 'label' in input) out.label = required(input.label, 'Label');
  if ('url' in input) {
    out.url = String(input.url ?? '').trim();
    if (out.url && !/^https?:\/\//i.test(out.url)) out.url = `https://${out.url}`;
  }
  if ('category' in input) out.category = oneOf(input.category, LINK_CATEGORIES, 'Category');
  if ('notes' in input) out.notes = String(input.notes ?? '');
  if ('featured' in input) out.featured = input.featured ? 1 : 0;
  return out;
}

const fromRow = (row) =>
  row && { ...row, featured: Boolean(row.featured), file: row.attachment_id ? getAttachment(row.attachment_id) : null };

export function listLinks(projectId) {
  return getDb()
    .prepare('SELECT * FROM links WHERE project_id = ? ORDER BY featured DESC, category, label COLLATE NOCASE')
    .all(projectId)
    .map(fromRow);
}

export function getLink(id) {
  return fromRow(getDb().prepare('SELECT * FROM links WHERE id = ?').get(id));
}

export function createLink(projectId, input, attachment = null) {
  const fields = clean(input, { creating: true });
  if (!fields.url && !attachment) throw new ValidationError('Add a URL or upload a file');
  return getLink(insertRow('links', { ...fields, project_id: projectId, attachment_id: attachment?.id ?? null }));
}

export function updateLink(id, input) {
  updateRow('links', id, clean(input, { creating: false }));
  return getLink(id);
}

export function deleteLink(id) {
  const row = getLink(id);
  if (!row) return false;
  getDb().prepare('DELETE FROM links WHERE id = ?').run(id);
  if (row.attachment_id) deleteAttachment(row.attachment_id);
  return true;
}
