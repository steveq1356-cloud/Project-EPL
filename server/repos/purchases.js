import { getDb } from '../db/connection.js';
import { ValidationError } from '../errors.js';
import { deleteAttachment, getAttachment } from './attachments.js';
import { cents, date, insertRow, oneOf, required, updateRow } from './common.js';

export const PURCHASE_STATUSES = ['Planned', 'Ordered', 'Arrived', 'Returned'];
// Statuses that count as money spent (Planned isn't spent yet; Returned was refunded).
export const SPENT_STATUSES = ['Ordered', 'Arrived'];

function clean(input, { creating }) {
  const out = {};
  if (creating || 'item' in input) out.item = required(input.item, 'Item');
  for (const key of ['vendor', 'link', 'notes', 'category']) if (key in input) out[key] = String(input[key] ?? '').trim();
  if ('qty' in input) {
    const qty = Number(input.qty ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) throw new ValidationError('Quantity must be more than 0');
    out.qty = qty;
  }
  if ('unit_cost' in input) out.unit_cost_cents = cents(input.unit_cost, 'Unit cost');
  if ('shipping_tax' in input) out.shipping_tax_cents = cents(input.shipping_tax, 'Shipping/tax');
  if ('date_ordered' in input) out.date_ordered = date(input.date_ordered, 'Date ordered');
  if ('status' in input) out.status = oneOf(input.status, PURCHASE_STATUSES, 'Status');
  return out;
}

const withReceipt = (row) => row && { ...row, receipt: row.receipt_id ? getAttachment(row.receipt_id) : null };

export function listPurchases(projectId) {
  return getDb()
    .prepare(
      `SELECT * FROM purchases WHERE project_id = ?
       ORDER BY COALESCE(date_ordered, substr(created_at, 1, 10)) DESC, id DESC`,
    )
    .all(projectId)
    .map(withReceipt);
}

export function getPurchase(id) {
  return withReceipt(getDb().prepare('SELECT * FROM purchases WHERE id = ?').get(id));
}

export function createPurchase(projectId, input) {
  const fields = clean(input, { creating: true });
  // Ordering something today is the common case; planned items have no date yet.
  if (!('date_ordered' in fields) && (fields.status ?? 'Planned') !== 'Planned') {
    fields.date_ordered = new Date().toISOString().slice(0, 10);
  }
  return getPurchase(insertRow('purchases', { ...fields, project_id: projectId }));
}

export function updatePurchase(id, input) {
  const fields = clean(input, { creating: false });
  const before = getPurchase(id);
  if (fields.status && fields.status !== 'Planned' && !before.date_ordered && !('date_ordered' in fields)) {
    fields.date_ordered = new Date().toISOString().slice(0, 10);
  }
  updateRow('purchases', id, fields);
  return getPurchase(id);
}

export function setReceipt(id, attachmentId) {
  const before = getPurchase(id);
  updateRow('purchases', id, { receipt_id: attachmentId });
  if (before.receipt_id && before.receipt_id !== attachmentId) deleteAttachment(before.receipt_id);
  return getPurchase(id);
}

export function deletePurchase(id) {
  const row = getPurchase(id);
  if (!row) return false;
  getDb().prepare('DELETE FROM purchases WHERE id = ?').run(id);
  if (row.receipt_id) deleteAttachment(row.receipt_id);
  return true;
}

export function listCategories() {
  return getDb()
    .prepare("SELECT DISTINCT category FROM purchases WHERE category != '' ORDER BY category COLLATE NOCASE")
    .all()
    .map((r) => r.category);
}

export function listVendors() {
  return getDb()
    .prepare("SELECT vendor, COUNT(*) n FROM purchases WHERE vendor != '' GROUP BY vendor COLLATE NOCASE ORDER BY n DESC")
    .all()
    .map((r) => r.vendor);
}
