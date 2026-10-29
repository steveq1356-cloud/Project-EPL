import { useMemo, useRef, useState } from 'react';
import { api } from '../../api/index.js';
import { BarList, ChartCard, LineChart, StatTile } from '../../components/charts/Charts.jsx';
import PurchaseForm from '../../components/PurchaseForm.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { PURCHASE_STATUSES, SPENT_STATUSES } from '../../constants.js';
import { money, plural, shortDate } from '../../utils/format.js';

const sortPurchases = (list) => [...list].sort((a, b) => (b.date_ordered ?? b.created_at).localeCompare(a.date_ordered ?? a.created_at) || b.id - a.id);

function groupSum(list, key) {
  const map = new Map();
  for (const p of list) {
    const k = p[key] || 'Uncategorized';
    map.set(k, (map.get(k) ?? 0) + p.total_cents);
  }
  return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export default function PurchasesSection({ project, purchases, setPurchases, onChanged, formOpen, setFormOpen }) {
  const { notify, deleteWithUndo } = useToasts();
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const receiptInput = useRef(null);
  const receiptFor = useRef(null);

  const spent = purchases.filter((p) => SPENT_STATUSES.includes(p.status));
  const spentCents = spent.reduce((s, p) => s + p.total_cents, 0);
  const plannedCents = purchases.filter((p) => p.status === 'Planned').reduce((s, p) => s + p.total_cents, 0);
  const returnedCents = purchases.filter((p) => p.status === 'Returned').reduce((s, p) => s + p.total_cents, 0);
  const counts = Object.fromEntries(PURCHASE_STATUSES.map((s) => [s, purchases.filter((p) => p.status === s).length]));
  const shown = filter === 'All' ? purchases : purchases.filter((p) => p.status === filter);

  // Cumulative spend over time, one point per order date.
  const cumulative = useMemo(() => {
    const byDate = new Map();
    for (const p of spent) {
      const d = p.date_ordered ?? p.created_at.slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + p.total_cents);
    }
    let run = 0;
    return [...byDate]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cents]) => ({ date: `${date}T12:00:00`, value: (run += cents), note: `+${money(cents)}` }));
  }, [purchases]);

  const byCategory = groupSum(spent, 'category');
  const byVendor = groupSum(spent, 'vendor');

  function replace(saved) {
    setPurchases((list) => sortPurchases(list.map((p) => (p.id === saved.id ? saved : p))));
  }

  async function update(p, fields) {
    try {
      replace(await api.purchases.update(p.id, fields));
      onChanged();
    } catch (e) {
      notify(e.message, { error: true });
    }
  }

  function remove(p) {
    setPurchases((list) => list.filter((x) => x.id !== p.id));
    deleteWithUndo(`Deleted ${p.item}`, {
      commit: async () => {
        await api.purchases.remove(p.id);
        onChanged();
      },
      undo: () => setPurchases((list) => sortPurchases([...list, p])),
    });
  }

  async function attachReceipt(file) {
    const p = receiptFor.current;
    if (!p || !file) return;
    try {
      replace(await api.purchases.uploadReceipt(p.id, file));
      notify(`Receipt attached to ${p.item}`);
    } catch (e) {
      notify(e.message, { error: true });
    }
  }

  return (
    <section id="purchases" className="card purchases-section">
      <header className="panel-head">
        <h2>
          <span className="section-num">05</span> Purchases
        </h2>
        <button className="btn btn-small btn-primary" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? 'Close' : '+ Add purchase'}
        </button>
      </header>

      <div className="kpi-row small">
        <StatTile
          label="Spent"
          value={money(spentCents)}
          meter={project.budget_cents ? { value: spentCents, max: project.budget_cents, label: 'Spent of budget' } : undefined}
          sub={project.budget_cents ? `of ${money(project.budget_cents, { whole: true })} budget` : plural(spent.length, 'order')}
        />
        <StatTile label="Planned" value={money(plannedCents)} sub={plural(counts.Planned, 'item')} />
        <StatTile label="In transit" value={counts.Ordered} sub="ordered, not arrived" />
        <StatTile label="Returned" value={money(returnedCents)} sub={plural(counts.Returned, 'item')} />
      </div>

      {formOpen && (
        <div className="purchase-form-wrap">
          <PurchaseForm
            projectId={project.id}
            onCancel={() => setFormOpen(false)}
            onSaved={(p) => {
              setPurchases((list) => sortPurchases([p, ...list]));
              onChanged();
              notify(`Added ${p.item}`);
            }}
          />
        </div>
      )}

      {purchases.length > 0 && (
        <div className="purchase-charts">
          <ChartCard
            title="Cumulative spend"
            subtitle={project.budget_cents ? 'Against budget' : 'Ordered + arrived'}
            className="flat"
            table={{ columns: [{ key: 'date', label: 'Date', format: (v) => shortDate(v.slice(0, 10)) }, { key: 'value', label: 'Total to date', numeric: true, format: (v) => money(v) }], rows: cumulative }}
          >
            <LineChart
              points={cumulative}
              format={(v, short) => money(v, { whole: true, compact: short })}
              reference={project.budget_cents ? { value: project.budget_cents, label: `Budget ${money(project.budget_cents, { whole: true })}` } : null}
              emptyText="No orders yet"
            />
          </ChartCard>
          <ChartCard title="By category" className="flat" table={{ columns: [{ key: 'label', label: 'Category' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) }], rows: byCategory }}>
            {byCategory.length ? <BarList items={byCategory} format={(v, s) => money(v, { whole: true, compact: s })} /> : <p className="muted small">No orders yet</p>}
          </ChartCard>
          <ChartCard title="By vendor" className="flat" table={{ columns: [{ key: 'label', label: 'Vendor' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) }], rows: byVendor }}>
            {byVendor.length ? <BarList items={byVendor} format={(v, s) => money(v, { whole: true, compact: s })} /> : <p className="muted small">No orders yet</p>}
          </ChartCard>
        </div>
      )}

      {purchases.length > 0 && (
        <div className="filter-chips" role="group" aria-label="Filter by status">
          {['All', ...PURCHASE_STATUSES].map((s) =>
            s === 'All' || counts[s] ? (
              <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s} <span className="muted">{s === 'All' ? purchases.length : counts[s]}</span>
              </button>
            ) : null,
          )}
        </div>
      )}

      {purchases.length === 0 && !formOpen && <p className="muted empty-state">No purchases yet. Press P anywhere to log one in a few seconds.</p>}

      {purchases.length > 0 && (
        <div className="table-wrap">
          <table className="data-table purchases-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Vendor</th>
                <th>Category</th>
                <th className="num">Qty</th>
                <th className="num">Unit</th>
                <th className="num">Ship/tax</th>
                <th className="num">Total</th>
                <th>Ordered</th>
                <th>Status</th>
                <th>Receipt</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} id={`purchase-${p.id}`} className="editing">
                    <td colSpan={11}>
                      <PurchaseForm
                        projectId={project.id}
                        purchase={p}
                        onCancel={() => setEditingId(null)}
                        onSaved={(saved) => {
                          replace(saved);
                          setEditingId(null);
                          onChanged();
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} id={`purchase-${p.id}`} className={`status-row-${p.status.toLowerCase()}`}>
                    <td className="item-cell">
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noreferrer">
                          {p.item} ↗
                        </a>
                      ) : (
                        p.item
                      )}
                      {p.notes && <div className="muted small">{p.notes}</div>}
                    </td>
                    <td>{p.vendor}</td>
                    <td>{p.category && <span className="chip-static">{p.category}</span>}</td>
                    <td className="num">{p.qty}</td>
                    <td className="num">{money(p.unit_cost_cents)}</td>
                    <td className="num">{p.shipping_tax_cents ? money(p.shipping_tax_cents) : '—'}</td>
                    <td className="num strong">{money(p.total_cents)}</td>
                    <td className="nowrap">{p.date_ordered ? shortDate(p.date_ordered) : '—'}</td>
                    <td>
                      <select className={`purchase-status ps-${p.status.toLowerCase()}`} value={p.status} onChange={(e) => update(p, { status: e.target.value })} aria-label="Status">
                        {PURCHASE_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {p.receipt ? (
                        <a href={p.receipt.url} target="_blank" rel="noreferrer" title={p.receipt.original_name}>
                          View
                        </a>
                      ) : (
                        <button
                          className="link-btn"
                          onClick={() => {
                            receiptFor.current = p;
                            receiptInput.current.click();
                          }}
                        >
                          Attach
                        </button>
                      )}
                    </td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => setEditingId(p.id)}>
                        Edit
                      </button>
                      <button className="row-remove" onClick={() => remove(p)} aria-label={`Delete ${p.item}`}>
                        ×
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>
                  {filter === 'All' ? 'Spent (ordered + arrived)' : `${filter} total`}
                </td>
                <td className="num strong">{money(filter === 'All' ? spentCents : shown.reduce((s, p) => s + p.total_cents, 0))}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <input
        ref={receiptInput}
        type="file"
        hidden
        onChange={(e) => {
          attachReceipt(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </section>
  );
}
