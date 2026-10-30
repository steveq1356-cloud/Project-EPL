import { useMemo, useRef, useState } from 'react';
import { api } from '../../api/index.js';
import { BarList, ChartCard, LineChart, Meter } from '../../components/charts/Charts.jsx';
import PurchaseForm from '../../components/PurchaseForm.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { PURCHASE_STATUSES, SPENT_STATUSES } from '../../constants.js';
import { money, shortDate } from '../../utils/format.js';

const sortPurchases = (list) => [...list].sort((a, b) => (b.date_ordered ?? b.created_at).localeCompare(a.date_ordered ?? a.created_at) || b.id - a.id);

function groupSum(list, key) {
  const map = new Map();
  for (const p of list) {
    const k = p[key] || 'Uncategorized';
    map.set(k, (map.get(k) ?? 0) + p.total_cents);
  }
  return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

const CHARTS_KEY = 'epl-purchase-charts';

export default function PurchasesSection({ project, purchases, setPurchases, onChanged, formOpen, setFormOpen }) {
  const { notify, deleteWithUndo } = useToasts();
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [showCharts, setShowCharts] = useState(() => {
    try {
      return localStorage.getItem(CHARTS_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const receiptInput = useRef(null);
  const receiptFor = useRef(null);

  const spent = purchases.filter((p) => SPENT_STATUSES.includes(p.status));
  const spentCents = spent.reduce((s, p) => s + p.total_cents, 0);
  const plannedCents = purchases.filter((p) => p.status === 'Planned').reduce((s, p) => s + p.total_cents, 0);
  const inTransit = purchases.filter((p) => p.status === 'Ordered').length;
  const statuses = PURCHASE_STATUSES.filter((s) => purchases.some((p) => p.status === s));
  const shown = filter === 'All' ? purchases : purchases.filter((p) => p.status === filter);

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

  function toggleCharts() {
    setShowCharts((s) => {
      try {
        localStorage.setItem(CHARTS_KEY, s ? 'off' : 'on');
      } catch {
        // not remembered — fine
      }
      return !s;
    });
  }

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
    <div className="purchases">
      {purchases.length > 0 && (
        <div className="purchase-summary">
          <div className="purchase-summary-main">
            <span className="big-number">{money(spentCents)}</span>
            <span className="muted">{project.budget_cents ? `spent of ${money(project.budget_cents, { whole: true })} budget` : 'spent'}</span>
            {project.budget_cents ? <Meter value={spentCents} max={project.budget_cents} label="Spent of budget" /> : null}
          </div>
          <span className="muted">
            {plannedCents > 0 && <>{money(plannedCents, { whole: true })} planned · </>}
            {inTransit} in transit
          </span>
          <button className="link-btn" onClick={toggleCharts}>
            {showCharts ? 'Hide charts' : 'Show charts'}
          </button>
        </div>
      )}

      {formOpen && (
        <div className="inset">
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

      {showCharts && spent.length > 0 && (
        <div className="purchase-charts">
          <ChartCard
            title="Cumulative spend"
            className="flat"
            table={{ columns: [{ key: 'date', label: 'Date', format: (v) => shortDate(v.slice(0, 10)) }, { key: 'value', label: 'Total to date', numeric: true, format: (v) => money(v) }], rows: cumulative }}
          >
            <LineChart
              points={cumulative}
              height={160}
              format={(v, short) => money(v, { whole: true, compact: short })}
              reference={project.budget_cents ? { value: project.budget_cents, label: `Budget ${money(project.budget_cents, { whole: true })}` } : null}
            />
          </ChartCard>
          <ChartCard title="By category" className="flat" table={{ columns: [{ key: 'label', label: 'Category' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v) }], rows: byCategory }}>
            <BarList items={byCategory} format={(v, s) => money(v, { whole: true, compact: s })} />
          </ChartCard>
        </div>
      )}

      {statuses.length > 1 && (
        <div className="filter-tabs" role="group" aria-label="Filter by status">
          {['All', ...statuses].map((s) => (
            <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {purchases.length === 0 && !formOpen && (
        <p className="empty-state">
          No purchases yet.{' '}
          <button className="link-btn" onClick={() => setFormOpen(true)}>
            Add the first one
          </button>{' '}
          or press <kbd>P</kbd> anywhere.
        </p>
      )}

      {purchases.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="num">Qty × unit</th>
                <th className="num">Total</th>
                <th>Ordered</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} id={`purchase-${p.id}`} className="editing">
                    <td colSpan={7}>
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
                  <tr key={p.id} id={`purchase-${p.id}`} className={p.status === 'Returned' ? 'returned' : ''}>
                    <td className="item-cell">
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noreferrer">
                          {p.item}
                        </a>
                      ) : (
                        p.item
                      )}
                      {(p.vendor || p.notes) && <div className="muted small">{[p.vendor, p.notes].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="muted">{p.category}</td>
                    <td className="num muted">
                      {p.qty} × {money(p.unit_cost_cents)}
                      {p.shipping_tax_cents ? <div className="small">+ {money(p.shipping_tax_cents)}</div> : null}
                    </td>
                    <td className="num strong">{money(p.total_cents)}</td>
                    <td className="nowrap muted">{p.date_ordered ? shortDate(p.date_ordered) : '—'}</td>
                    <td>
                      <select className={`purchase-status ps-${p.status.toLowerCase()}`} value={p.status} onChange={(e) => update(p, { status: e.target.value })} aria-label="Status">
                        {PURCHASE_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="row-actions">
                      {p.receipt ? (
                        <a className="link-btn" href={p.receipt.url} target="_blank" rel="noreferrer" title={p.receipt.original_name}>
                          Receipt
                        </a>
                      ) : (
                        <button
                          className="link-btn hover-only"
                          onClick={() => {
                            receiptFor.current = p;
                            receiptInput.current.click();
                          }}
                        >
                          + Receipt
                        </button>
                      )}
                      <button className="link-btn hover-only" onClick={() => setEditingId(p.id)}>
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
    </div>
  );
}
