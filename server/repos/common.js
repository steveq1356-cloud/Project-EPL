import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export function date(value, field) {
  if (value === '' || value == null) return null;
  if (!DATE_RE.test(value)) throw new ValidationError(`${field} must be YYYY-MM-DD`);
  return value;
}

export function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  return value;
}

export function required(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new ValidationError(`${field} is required`);
  return text;
}

// Money arrives from the UI in dollars (12.5) and is stored as integer cents.
export function cents(value, field) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${field} must be a positive number`);
  return Math.round(n * 100);
}

export function insertRow(table, fields) {
  const cols = Object.keys(fields);
  return getDb()
    .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
    .run(fields).lastInsertRowid;
}

// Updates only the given columns and bumps updated_at (when the table has one).
export function updateRow(table, id, fields, { touch = true } = {}) {
  const cols = Object.keys(fields);
  if (!cols.length) return;
  const sets = cols.map((c) => `${c} = @${c}`);
  if (touch) sets.push(`updated_at = ${NOW_SQL}`);
  getDb().prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = @id`).run({ ...fields, id });
}
