import { useEffect, useId, useState } from 'react';
import { api } from '../api/index.js';
import { PURCHASE_STATUSES } from '../constants.js';
import { centsToInput, localDate, money } from '../utils/format.js';

// Create or edit a purchase. The total updates as you type; Ctrl+Enter saves.
export default function PurchaseForm({ projectId, purchase, onSaved, onCancel, compact = false }) {
  const [f, setF] = useState(() => ({
    item: purchase?.item ?? '',
    vendor: purchase?.vendor ?? '',
    category: purchase?.category ?? '',
    qty: purchase?.qty ?? 1,
    unit_cost: centsToInput(purchase?.unit_cost_cents),
    shipping_tax: centsToInput(purchase?.shipping_tax_cents),
    status: purchase?.status ?? 'Ordered',
    date_ordered: purchase?.date_ordered ?? localDate(),
    link: purchase?.link ?? '',
    notes: purchase?.notes ?? '',
  }));
  const [receipt, setReceipt] = useState(null);
  const [meta, setMeta] = useState({ categories: [], vendors: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const ids = { vendors: useId(), categories: useId() };

  useEffect(() => {
    api.purchases.meta().then(setMeta).catch(() => {});
  }, []);

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }));
  const total = Math.round((Number(f.qty) || 0) * (Number(f.unit_cost) || 0) * 100) + Math.round((Number(f.shipping_tax) || 0) * 100);

  async function submit(e) {
    e?.preventDefault();
    if (!f.item.trim() || saving || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      // Something only planned hasn't been ordered yet, so it has no order date.
      const fields = { ...f, date_ordered: f.status === 'Planned' ? null : f.date_ordered || null };
      let saved = purchase ? await api.purchases.update(purchase.id, fields) : await api.purchases.create(projectId, fields);
      if (receipt) saved = await api.purchases.uploadReceipt(saved.id, receipt);
      onSaved(saved);
      if (!purchase) {
        setF((prev) => ({ ...prev, item: '', qty: 1, unit_cost: '', shipping_tax: '', link: '', notes: '' }));
        setReceipt(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`form purchase-form ${compact ? 'compact' : ''}`}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
      }}
    >
      <div className="form-grid">
        <label className="span-2">
          Item
          <input value={f.item} onChange={set('item')} placeholder="e.g. NEMA 17 stepper motor" required />
        </label>
        <label>
          Vendor
          <input value={f.vendor} onChange={set('vendor')} list={ids.vendors} placeholder="Amazon, McMaster…" />
        </label>
        <label>
          Category
          <input value={f.category} onChange={set('category')} list={ids.categories} placeholder="Electronics, Hardware…" />
        </label>
        <label>
          Qty
          <input type="number" min="0" step="any" value={f.qty} onChange={set('qty')} />
        </label>
        <label>
          Unit cost ($)
          <input type="number" min="0" step="0.01" value={f.unit_cost} onChange={set('unit_cost')} placeholder="0.00" />
        </label>
        <label>
          Shipping + tax ($)
          <input type="number" min="0" step="0.01" value={f.shipping_tax} onChange={set('shipping_tax')} placeholder="0.00" />
        </label>
        <label>
          Status
          <select value={f.status} onChange={set('status')}>
            {PURCHASE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Date ordered
          <input type="date" value={f.date_ordered ?? ''} onChange={set('date_ordered')} />
        </label>
        <label>
          <span>
            Receipt <span className="muted">(optional)</span>
          </span>
          <input type="file" onChange={(e) => setReceipt(e.target.files[0] ?? null)} />
        </label>
        <label className="span-2">
          <span>
            Link <span className="muted">(optional)</span>
          </span>
          <input value={f.link} onChange={set('link')} placeholder="https://…" />
        </label>
        {!compact && (
          <label className="span-2">
            Notes
            <input value={f.notes} onChange={set('notes')} placeholder="Part number, why this one…" />
          </label>
        )}
      </div>
      <datalist id={ids.vendors}>
        {meta.vendors.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id={ids.categories}>
        {meta.categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <span className="purchase-total">
          Total <strong>{money(total)}</strong>
        </span>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || !f.item.trim() || !projectId}>
          {saving ? 'Saving…' : purchase ? 'Save purchase' : 'Add purchase'}
        </button>
      </div>
    </form>
  );
}
