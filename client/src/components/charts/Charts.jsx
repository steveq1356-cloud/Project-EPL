// Small hand-built SVG charts. Colors come from CSS tokens (--viz-*), validated for
// both themes; every chart has hover/focus tooltips and a table view.
import { useLayoutEffect, useMemo, useState } from 'react';

// ---- shared pieces ----

// Measures an element's width. Returns a callback ref (it also exposes .current),
// so it keeps working when the measured element is swapped out.
function useWidth() {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);
  const ref = useMemo(() => {
    const cb = (node) => {
      cb.current = node;
      setEl(node);
    };
    cb.current = null;
    return cb;
  }, []);
  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [el]);
  return [ref, width];
}

// Rounded "nice" axis maximum and ticks, e.g. 0 / 50 / 100 / 150.
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks.at(-1) < max) ticks.push(ticks.at(-1) + step);
  return ticks;
}

// A column/bar path with a 4px rounded data end and a square base.
function barPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function hbarPath(x, y, w, h, r = 4) {
  if (w <= 0) return '';
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div className="viz-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.rows.map((row, i) => (
        <div key={i} className="viz-tooltip-row">
          {row.key && <span className="viz-key-line" />}
          <strong>{row.value}</strong>
          {row.label && <span className="viz-tooltip-label">{row.label}</span>}
        </div>
      ))}
      {tip.title && <div className="viz-tooltip-title">{tip.title}</div>}
    </div>
  );
}

// Card frame with a title, optional subtitle and a Chart / Table switch.
export function ChartCard({ title, subtitle, table, actions, children, className = '' }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`card chart-card ${className}`}>
      <header className="chart-card-header">
        <div>
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-card-actions">
          {actions}
          {table && (
            <button className="link-btn" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable}>
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </header>
      {showTable && table ? <DataTable {...table} /> : children}
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="viz-table-wrap">
      <table className="viz-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.numeric ? 'num' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'num' : ''}>
                  {c.format ? c.format(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- figures ----

export function StatTile({ label, value, sub, delta, deltaGood = true, meter, accent = false, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`stat-tile ${accent ? 'accent' : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {meter && <Meter {...meter} />}
      {(sub || delta) && (
        <span className="stat-sub">
          {delta && <span className={`delta ${delta.startsWith('+') === deltaGood ? 'good' : 'bad'}`}>{delta}</span>} {sub}
        </span>
      )}
    </Tag>
  );
}

// Fill on a lighter track of the same hue; warning past `warnAt`, danger past 100%.
export function Meter({ value, max, warnAt = 0.9, label }) {
  const ratio = max > 0 ? value / max : 0;
  const state = ratio > 1 ? 'danger' : ratio >= warnAt ? 'warn' : 'ok';
  return (
    <span className={`meter meter-${state}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <span className="meter-fill" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </span>
  );
}

// ---- column chart (one series over time) ----

export function ColumnChart({ data, format, height = 180, tooltipRows, emptyText = 'Nothing to chart yet' }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  if (!data.some((d) => d.value > 0)) {
    return (
      <div className="viz viz-empty-frame" style={{ height }} ref={ref}>
        <p className="muted">{emptyText}</p>
      </div>
    );
  }
  const pad = { top: 12, right: 8, bottom: 24, left: 44 };
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const max = ticks.at(-1);
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, Math.max(4, band - 6));
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const maxIndex = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <div className="viz" ref={ref} onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line className="viz-grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="viz-tick" x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {format(t, true)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + i * band + (band - barW) / 2;
            const top = y(d.value);
            const show = (e) => {
              const box = ref.current.getBoundingClientRect();
              setTip({
                x: Math.min(box.width - 160, Math.max(0, (e?.clientX ?? box.left + x) - box.left + 12)),
                y: Math.max(0, top - 10),
                title: d.title ?? d.label,
                rows: tooltipRows ? tooltipRows(d) : [{ value: format(d.value) }],
              });
            };
            return (
              <g key={d.label} className="viz-hit" tabIndex={0} onPointerMove={show} onFocus={() => show()} onBlur={() => setTip(null)} aria-label={`${d.title ?? d.label}: ${format(d.value)}`}>
                <rect x={pad.left + i * band} y={pad.top} width={band} height={innerH} fill="transparent" />
                <path className="viz-bar" d={barPath(x, top, barW, pad.top + innerH - top)} />
                {i === maxIndex && d.value > 0 && (
                  <text className="viz-value" x={x + barW / 2} y={top - 5} textAnchor="middle">
                    {format(d.value, true)}
                  </text>
                )}
                <text className="viz-tick" x={x + barW / 2} y={height - 6} textAnchor="middle">
                  {d.label}
                </text>
              </g>
            );
          })}
          <line className="viz-axis" x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} />
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

// ---- cumulative line with area wash and crosshair ----

export function LineChart({ points, format, height = 180, reference, emptyText = 'No data yet' }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 14, right: 16, bottom: 24, left: 48 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const t0 = points.length ? new Date(points[0].date).getTime() : 0;
  const t1 = points.length ? Math.max(new Date(points.at(-1).date).getTime(), t0 + 86400000) : 1;
  const ticks = niceTicks(Math.max(...points.map((p) => p.value), reference?.value ?? 0, 0));
  const max = ticks.at(-1);
  const x = (date) => pad.left + ((new Date(date).getTime() - t0) / (t1 - t0)) * innerW;
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');
  const area = points.length ? `${line} L${x(points.at(-1).date)},${y(0)} L${x(points[0].date)},${y(0)} Z` : '';

  function onMove(e) {
    const box = ref.current.getBoundingClientRect();
    const px = e.clientX - box.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    setHover(best);
  }

  const xLabels = useMemo(() => {
    if (!points.length) return [];
    const first = points[0].date;
    const last = points.at(-1).date;
    return first === last ? [first] : [first, last];
  }, [points]);

  if (!points.length) return <p className="muted viz-empty">{emptyText}</p>;
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="viz" ref={ref} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Line chart">
          {ticks.map((t) => (
            <g key={t}>
              <line className="viz-grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="viz-tick" x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {format(t, true)}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line className="viz-reference" x1={pad.left} x2={width - pad.right} y1={y(reference.value)} y2={y(reference.value)} />
              <text className="viz-reference-label" x={width - pad.right} y={y(reference.value) - 5} textAnchor="end">
                {reference.label}
              </text>
            </g>
          )}
          <path className="viz-area" d={area} />
          <path className="viz-line" d={line} />
          {xLabels.map((d, i) => (
            <text key={d + i} className="viz-tick" x={x(d)} y={height - 6} textAnchor={i === 0 ? 'start' : 'end'}>
              {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          ))}
          <line className="viz-axis" x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} />
          {/* end label on the last point */}
          <circle className="viz-dot" cx={x(points.at(-1).date)} cy={y(points.at(-1).value)} r={4} />
          {hp && (
            <g>
              <line className="viz-crosshair" x1={x(hp.date)} x2={x(hp.date)} y1={pad.top} y2={pad.top + innerH} />
              <circle className="viz-dot" cx={x(hp.date)} cy={y(hp.value)} r={5} />
            </g>
          )}
        </svg>
      )}
      {hp && (
        <Tooltip
          tip={{
            x: Math.min(width - 180, Math.max(0, x(hp.date) + 10)),
            y: Math.max(0, y(hp.value) - 30),
            title: `${new Date(hp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${hp.note ? ` · ${hp.note}` : ''}`,
            rows: [{ value: format(hp.value), label: 'total to date' }],
          }}
        />
      )}
    </div>
  );
}

// ---- horizontal bars (rank a handful of categories) ----

export function BarList({ items, format, max: maxItems = 6, onSelect }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const shown = items.slice(0, maxItems);
  const rest = items.slice(maxItems);
  const rows = rest.length ? [...shown, { label: `Other (${rest.length})`, value: rest.reduce((s, r) => s + r.value, 0) }] : shown;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const labelW = Math.min(140, Math.max(70, width * 0.32));
  const valueW = 64;
  const barMax = Math.max(0, width - labelW - valueW - 8);
  const rowH = 26;

  return (
    <div className="viz" ref={ref} onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={rows.length * rowH} role="img" aria-label="Bar chart">
          {rows.map((r, i) => {
            const w = (r.value / max) * barMax;
            const yy = i * rowH;
            return (
              <g
                key={r.label}
                className={`viz-hit ${onSelect && r.id ? 'clickable' : ''}`}
                tabIndex={0}
                onClick={() => onSelect && r.id && onSelect(r)}
                onPointerMove={() => setTip({ x: labelW + Math.min(w, barMax - 120), y: yy - 34, title: r.label, rows: [{ value: format(r.value) }, ...(r.extra ?? [])] })}
                onFocus={() => setTip({ x: labelW, y: yy - 34, title: r.label, rows: [{ value: format(r.value) }] })}
                onBlur={() => setTip(null)}
                aria-label={`${r.label}: ${format(r.value)}`}
              >
                <rect x={0} y={yy} width={width} height={rowH} fill="transparent" />
                <text className="viz-label" x={0} y={yy + rowH / 2} dy="0.32em">
                  {r.label.length > 20 ? `${r.label.slice(0, 19)}…` : r.label}
                </text>
                <path className="viz-bar" d={hbarPath(labelW, yy + 6, Math.max(w, 2), rowH - 12)} />
                <text className="viz-value" x={labelW + Math.max(w, 2) + 6} y={yy + rowH / 2} dy="0.32em">
                  {format(r.value, true)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

// ---- calendar heatmap (activity per day, weeks as columns) ----

const LEVELS = 4;
const KIND_LABELS = { log: 'log entries', photo: 'photos', purchase: 'purchases', task: 'tasks done' };

export function Heatmap({ byDay, weeks = 26 }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);

  const { cells, months, max, total, activeDays } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay()); // start on a Sunday
    const out = [];
    const monthMarks = [];
    let maxN = 0;
    let sum = 0;
    let days = 0;
    for (let d = new Date(start), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const info = byDay[key];
      const n = info?.total ?? 0;
      maxN = Math.max(maxN, n);
      sum += n;
      if (n) days++;
      const col = Math.floor(i / 7);
      if (d.getDate() === 1 || i === 0) monthMarks.push({ col, label: d.toLocaleDateString(undefined, { month: 'short' }) });
      out.push({ key, n, info, col, row: d.getDay(), date: new Date(d) });
    }
    return { cells: out, months: monthMarks, max: maxN, total: sum, activeDays: days };
  }, [byDay, weeks]);

  const cols = Math.ceil(cells.length / 7);
  const gap = 3;
  const left = 22;
  const size = width ? Math.max(8, Math.min(16, Math.floor((width - left) / cols) - gap)) : 12;
  const level = (n) => (n === 0 ? 0 : Math.max(1, Math.ceil((n / Math.max(max, 1)) * LEVELS)));

  return (
    <div className="viz heatmap" ref={ref} onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={left + cols * (size + gap)} height={16 + 7 * (size + gap)} role="img" aria-label={`Activity: ${total} events on ${activeDays} days`}>
          {months
            .filter((m, i, arr) => i === 0 || m.col - arr[i - 1].col >= 3)
            .map((m) => (
              <text key={`${m.col}-${m.label}`} className="viz-tick" x={left + m.col * (size + gap)} y={10}>
                {m.label}
              </text>
            ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} className="viz-tick" x={0} y={16 + (1 + i * 2) * (size + gap) + size / 2} dy="0.32em">
              {d.slice(0, 1)}
            </text>
          ))}
          {cells.map((c) => {
            const show = () =>
              setTip({
                x: Math.min(width - 170, left + c.col * (size + gap)),
                y: 16 + c.row * (size + gap) - 44,
                title: c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                rows: c.n
                  ? Object.entries(KIND_LABELS)
                      .filter(([k]) => c.info[k])
                      .map(([k, label]) => ({ value: c.info[k], label }))
                  : [{ value: 'No activity' }],
              });
            return (
              <rect
                key={c.key}
                className={`heat-cell heat-${level(c.n)}`}
                x={left + c.col * (size + gap)}
                y={16 + c.row * (size + gap)}
                width={size}
                height={size}
                rx={2}
                tabIndex={c.n ? 0 : -1}
                onPointerMove={show}
                onFocus={show}
                onBlur={() => setTip(null)}
              >
                <title>{`${c.key}: ${c.n}`}</title>
              </rect>
            );
          })}
        </svg>
      )}
      <div className="heat-legend">
        <span className="muted small">
          {total} events · {activeDays} active days
        </span>
        <span className="heat-scale" aria-hidden>
          <span className="muted small">Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heat-swatch heat-${l}`} />
          ))}
          <span className="muted small">More</span>
        </span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

// Helper for tables: build a { columns, rows } pair from a heatmap's data.
export function heatmapTable(byDay) {
  return {
    columns: [
      { key: 'day', label: 'Day' },
      ...Object.entries(KIND_LABELS).map(([key, label]) => ({ key, label, numeric: true, format: (v) => v ?? 0 })),
      { key: 'total', label: 'Total', numeric: true },
    ],
    rows: Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, v]) => ({ day, ...v })),
  };
}
