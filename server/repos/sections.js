import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { SECTION_KINDS } from '../layout.js';
import { insertRow, oneOf, required, updateRow } from './common.js';

const MAX_DATA_BYTES = 1_000_000;

const fromRow = (row) => row && { ...row, data: JSON.parse(row.data) };

// Keeps each kind's data in a known shape so the UI can trust it.
function cleanData(kind, data = {}) {
  const d = data && typeof data === 'object' ? data : {};
  switch (kind) {
    case 'notes':
      return { body: String(d.body ?? '') };
    case 'checklist':
      return {
        items: (Array.isArray(d.items) ? d.items : []).map((it, i) => ({
          id: String(it?.id ?? `${Date.now()}-${i}`),
          text: String(it?.text ?? ''),
          done: Boolean(it?.done),
        })),
      };
    case 'table': {
      const columns = (Array.isArray(d.columns) ? d.columns : []).slice(0, 30).map((c) => ({ name: String(c?.name ?? ''), unit: String(c?.unit ?? '') }));
      const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 5000).map((r) => columns.map((_, i) => String((Array.isArray(r) ? r[i] : '') ?? '')));
      const chart = d.chart && Number.isInteger(d.chart.x) && Number.isInteger(d.chart.y) ? { x: d.chart.x, y: d.chart.y } : null;
      return { columns, rows, chart };
    }
    case 'embed':
      return { url: String(d.url ?? '').trim(), height: Math.min(1600, Math.max(240, Number(d.height) || 560)) };
    default:
      return {};
  }
}

function serialize(kind, data) {
  const json = JSON.stringify(cleanData(kind, data));
  if (json.length > MAX_DATA_BYTES) throw new ValidationError('This section is too large (over 1 MB)');
  return json;
}

export function listSections(projectId) {
  return getDb().prepare('SELECT * FROM sections WHERE project_id = ? ORDER BY id').all(projectId).map(fromRow);
}

export function getSection(id) {
  return fromRow(getDb().prepare('SELECT * FROM sections WHERE id = ?').get(id));
}

export function createSection(projectId, input) {
  const kind = oneOf(input.kind, SECTION_KINDS, 'Section type');
  const title = required(input.title, 'Title');
  return getSection(insertRow('sections', { project_id: projectId, kind, title, data: serialize(kind, input.data) }));
}

export function updateSection(id, input) {
  const section = getSection(id);
  const fields = {};
  if ('title' in input) fields.title = required(input.title, 'Title');
  if ('data' in input) fields.data = serialize(section.kind, input.data);
  updateRow('sections', id, fields);
  return getSection(id);
}

export function deleteSection(id) {
  return getDb().prepare('DELETE FROM sections WHERE id = ?').run(id).changes > 0;
}
