// Sections you add yourself: Notes, Checklist, Data table, Embed.
import { useEffect, useMemo, useRef, useState } from 'react';
import { XYChart } from '../../components/charts/Charts.jsx';
import Markdown from '../../components/Markdown.jsx';

// Local copy of a section's data that saves itself shortly after you stop typing
// (and right away when the section unmounts).
function useAutosave(section, save, delay = 600) {
  const [data, setData] = useState(section.data);
  const latest = useRef(section.data); // so quick successive edits build on each other
  const pending = useRef(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    latest.current = section.data;
    setData(section.data);
  }, [section.id]);

  const flush = () => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      saveRef.current(pending.current.data);
      pending.current = null;
    }
  };
  useEffect(() => flush, []);

  const change = (next) => {
    const value = typeof next === 'function' ? next(latest.current) : next;
    latest.current = value;
    setData(value);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { data: value, timer: setTimeout(flush, delay) };
  };
  return [data, change, flush];
}

// ---------------- Notes ----------------

export function NotesSection({ section, save }) {
  const [data, change, flush] = useAutosave(section, save);
  const [editing, setEditing] = useState(!section.data.body.trim());

  if (!editing) {
    return (
      <div className="notes" onDoubleClick={() => setEditing(true)}>
        <Markdown>{data.body}</Markdown>
        <button className="link-btn notes-edit" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    );
  }
  return (
    <div className="notes editing">
      <textarea
        className="notes-input"
        value={data.body}
        autoFocus={Boolean(section.data.body)}
        onChange={(e) => change({ body: e.target.value })}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || e.key === 'Escape') {
            flush();
            if (data.body.trim()) setEditing(false);
          }
        }}
        rows={Math.min(24, Math.max(6, data.body.split('\n').length + 2))}
        placeholder="Write in Markdown — headings, lists, tables, checkboxes…"
      />
      <div className="notes-bar">
        <span className="muted small">Saves as you type · Markdown</span>
        <button
          className="btn btn-small"
          onClick={() => {
            flush();
            setEditing(false);
          }}
          disabled={!data.body.trim()}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ---------------- Checklist ----------------

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function ChecklistSection({ section, save }) {
  const [data, change] = useAutosave(section, save, 300);
  const [draft, setDraft] = useState('');
  const items = data.items;
  const done = items.filter((i) => i.done).length;

  const setItems = (fn) => change((d) => ({ ...d, items: fn(d.items) }));

  return (
    <div className="checklist">
      {items.length > 0 && (
        <div className="checklist-progress">
          <span className="muted small">
            {done} of {items.length} done
          </span>
          <span className="meter">
            <span className="meter-fill" style={{ width: `${(done / items.length) * 100}%` }} />
          </span>
        </div>
      )}
      <ul className="task-list">
        {items.map((it, i) => (
          <li key={it.id} className={`task-row ${it.done ? 'done' : ''}`}>
            <input type="checkbox" checked={it.done} onChange={() => setItems((list) => list.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} />
            <input
              className="checklist-text"
              value={it.text}
              onChange={(e) => setItems((list) => list.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !it.text) {
                  e.preventDefault();
                  setItems((list) => list.filter((x) => x.id !== it.id));
                }
              }}
              aria-label={`Item ${i + 1}`}
            />
            <span className="task-meta">
              <button className="row-remove" onClick={() => setItems((list) => list.filter((x) => x.id !== it.id))} aria-label="Remove item">
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setItems((list) => [...list, { id: newId(), text: draft.trim(), done: false }]);
          setDraft('');
        }}
      >
        <span className="task-form-box" aria-hidden />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an item…" />
      </form>
    </div>
  );
}

// ---------------- Data table ----------------

const isNum = (v) => v !== '' && v != null && Number.isFinite(Number(String(v).replace(/,/g, '')));
const num = (v) => Number(String(v).replace(/,/g, ''));

export function TableSection({ section, save }) {
  const [data, change] = useAutosave(section, save, 500);
  const { columns, rows, chart } = data;
  const set = (fn) => change((d) => fn(structuredClone(d)));

  const numericCols = useMemo(() => columns.map((_, c) => rows.some((r) => r[c] !== '') && rows.every((r) => r[c] === '' || isNum(r[c]))), [columns, rows]);
  const numericIdx = numericCols.flatMap((ok, i) => (ok ? [i] : []));

  function setCell(r, c, value) {
    set((d) => {
      d.rows[r][c] = value;
      return d;
    });
  }

  // Paste a block from Excel / Sheets (tab-separated) starting at this cell.
  function onPaste(e, r0, c0) {
    const text = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text)) return;
    e.preventDefault();
    let grid = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
    // Pasting at the top with a text first line over numbers below: treat it as headers,
    // and pull units out of "Load (N)" / "Deflection [mm]".
    let headers = null;
    const looksLikeHeader = grid.length > 1 && grid[0].some((v, j) => v.trim() && !isNum(v) && grid.slice(1).some((row) => isNum(row[j])));
    if (r0 === 0 && looksLikeHeader) {
      headers = grid[0].map((h) => {
        const m = h.trim().match(/^(.*?)\s*[([]\s*([^)\]]+)\s*[)\]]\s*$/);
        return m ? { name: m[1], unit: m[2] } : { name: h.trim(), unit: '' };
      });
      grid = grid.slice(1);
    }
    set((d) => {
      if (headers) headers.forEach((h, j) => (d.columns[c0 + j] = h));
      const needCols = c0 + Math.max(...grid.map((g) => g.length));
      while (d.columns.length < needCols) d.columns.push({ name: `Column ${d.columns.length + 1}`, unit: '' });
      d.rows.forEach((row) => {
        while (row.length < d.columns.length) row.push('');
      });
      grid.forEach((line, i) => {
        const r = r0 + i;
        if (!d.rows[r]) d.rows[r] = d.columns.map(() => '');
        line.forEach((v, j) => (d.rows[r][c0 + j] = v.trim()));
      });
      return d;
    });
  }

  const addRow = () =>
    set((d) => {
      d.rows.push(d.columns.map(() => ''));
      return d;
    });
  const addColumn = () =>
    set((d) => {
      d.columns.push({ name: `Column ${d.columns.length + 1}`, unit: '' });
      d.rows.forEach((r) => r.push(''));
      return d;
    });
  const removeColumn = (c) =>
    set((d) => {
      d.columns.splice(c, 1);
      d.rows.forEach((r) => r.splice(c, 1));
      if (d.chart && (d.chart.x === c || d.chart.y === c)) d.chart = null;
      else if (d.chart) d.chart = { x: d.chart.x > c ? d.chart.x - 1 : d.chart.x, y: d.chart.y > c ? d.chart.y - 1 : d.chart.y };
      return d;
    });
  const removeRow = (r) =>
    set((d) => {
      d.rows.splice(r, 1);
      return d;
    });

  const colLabel = (c) => (columns[c] ? `${columns[c].name || `Column ${c + 1}`}${columns[c].unit ? ` (${columns[c].unit})` : ''}` : '');
  const stats = columns.map((_, c) => {
    if (!numericCols[c]) return null;
    const vals = rows.map((r) => r[c]).filter(isNum).map(num);
    if (!vals.length) return null;
    return { min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length };
  });
  const chartOn = chart && numericCols[chart.x] && numericCols[chart.y];
  const points = chartOn ? rows.filter((r) => isNum(r[chart.x]) && isNum(r[chart.y])).map((r) => ({ x: num(r[chart.x]), y: num(r[chart.y]) })) : [];
  const fmt = (v) => Number(v.toPrecision(4)).toString();

  return (
    <div className="data-sheet">
      {numericIdx.length >= 2 && (
        <div className="sheet-toolbar">
          {chartOn ? (
            <>
              <span className="muted small">Chart</span>
              <select value={chart.y} onChange={(e) => set((d) => ({ ...d, chart: { ...d.chart, y: Number(e.target.value) } }))} aria-label="Y axis">
                {numericIdx.map((c) => (
                  <option key={c} value={c}>
                    {colLabel(c)}
                  </option>
                ))}
              </select>
              <span className="muted small">vs</span>
              <select value={chart.x} onChange={(e) => set((d) => ({ ...d, chart: { ...d.chart, x: Number(e.target.value) } }))} aria-label="X axis">
                {numericIdx.map((c) => (
                  <option key={c} value={c}>
                    {colLabel(c)}
                  </option>
                ))}
              </select>
              <button className="link-btn" onClick={() => set((d) => ({ ...d, chart: null }))}>
                Hide chart
              </button>
            </>
          ) : (
            <button className="link-btn" onClick={() => set((d) => ({ ...d, chart: { x: numericIdx[0], y: numericIdx[1] } }))}>
              Chart two columns
            </button>
          )}
        </div>
      )}

      {chartOn && <XYChart points={points} xLabel={colLabel(chart.x)} yLabel={colLabel(chart.y)} />}

      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th className="row-num" />
              {columns.map((col, c) => (
                <th key={c}>
                  <div className="sheet-head">
                    <input
                      className="sheet-col-name"
                      value={col.name}
                      onChange={(e) =>
                        set((d) => {
                          d.columns[c].name = e.target.value;
                          return d;
                        })
                      }
                      placeholder={`Column ${c + 1}`}
                      aria-label={`Column ${c + 1} name`}
                    />
                    <input
                      className="sheet-col-unit"
                      value={col.unit}
                      onChange={(e) =>
                        set((d) => {
                          d.columns[c].unit = e.target.value;
                          return d;
                        })
                      }
                      placeholder="unit"
                      aria-label={`Column ${c + 1} unit`}
                    />
                    {columns.length > 1 && (
                      <button className="row-remove" onClick={() => removeColumn(c)} title="Delete column" aria-label={`Delete column ${c + 1}`}>
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="sheet-add-col">
                <button className="link-btn" onClick={addColumn} title="Add column">
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="row-num">
                  <span>{r + 1}</span>
                  <button className="row-remove" onClick={() => removeRow(r)} aria-label={`Delete row ${r + 1}`}>
                    ×
                  </button>
                </td>
                {columns.map((_, c) => (
                  <td key={c} className={numericCols[c] ? 'num' : ''}>
                    <input
                      value={row[c] ?? ''}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      onPaste={(e) => onPaste(e, r, c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (r === rows.length - 1) addRow();
                          requestAnimationFrame(() => e.target.closest('tbody').rows[r + 1]?.cells[c + 1]?.querySelector('input')?.focus());
                        }
                      }}
                      aria-label={`Row ${r + 1}, ${colLabel(c)}`}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
          {stats.some(Boolean) && (
            <tfoot>
              <tr>
                <td className="row-num" />
                {stats.map((s, c) => (
                  <td key={c} className="num">
                    {s && (
                      <span className="sheet-stats" title={`${s.n} values`}>
                        x̄ {fmt(s.mean)} · {fmt(s.min)}–{fmt(s.max)}
                      </span>
                    )}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="sheet-footer">
        <button className="link-btn" onClick={addRow}>
          + Row
        </button>
        <span className="muted small">Tip: paste a block straight from Excel or Google Sheets</span>
      </div>
    </div>
  );
}

// ---------------- Embed ----------------

export function EmbedSection({ section, save }) {
  const [data, change, flush] = useAutosave(section, save);
  const [editing, setEditing] = useState(!section.data.url);
  const url = data.url && !/^https?:\/\//i.test(data.url) ? `https://${data.url}` : data.url;

  return (
    <div className="embed">
      {(editing || !url) && (
        <form
          className="embed-form"
          onSubmit={(e) => {
            e.preventDefault();
            flush();
            if (data.url) setEditing(false);
          }}
        >
          <input value={data.url} onChange={(e) => change({ ...data, url: e.target.value })} placeholder="https://… (Onshape, Desmos, a dashboard, any page)" autoFocus aria-label="URL" />
          <select value={data.height} onChange={(e) => change({ ...data, height: Number(e.target.value) })} aria-label="Height">
            {[360, 560, 760, 960].map((h) => (
              <option key={h} value={h}>
                {h}px tall
              </option>
            ))}
          </select>
          <button className="btn btn-small btn-primary">Show</button>
        </form>
      )}
      {url && !editing && (
        <>
          <iframe title={section.title} src={url} style={{ height: data.height }} allow="fullscreen; clipboard-read; clipboard-write" />
          <div className="embed-bar">
            <span className="muted small">{url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]} · blank? the site may block embedding</span>
            <span>
              <a className="link-btn" href={url} target="_blank" rel="noreferrer">
                Open
              </a>
              <button className="link-btn" onClick={() => setEditing(true)}>
                Change
              </button>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
