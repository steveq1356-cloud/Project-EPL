import { getDb } from '../db/connection.js';

const fromRow = (row) => row && { ...row, tags: JSON.parse(row.tags) };

export function listProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY name COLLATE NOCASE').all().map(fromRow);
}

export function getProject(id) {
  return fromRow(getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id));
}
