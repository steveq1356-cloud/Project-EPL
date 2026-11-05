import { useLayoutEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { daysBetween, localDate, shortDate } from '../../utils/format.js';
import ProjectAvatar from '../ProjectAvatar.jsx';

// Projects as bars from start to target date, with milestones as diamonds and a
// line for today. One series (the bar color); identity comes from the row labels.
export default function Timeline({ projects, milestones }) {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState(null);

  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const today = localDate();
  const rows = useMemo(
    () =>
      projects
        .filter((p) => p.start_date)
        .map((p) => ({ p, start: p.start_date, end: p.target_date, open: !p.target_date }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [projects],
  );

  if (!rows.length) {
    return <p className="feed-empty">Give your projects a start and target date (in their header) to see them on a timeline.</p>;
  }

  // Range: earliest start → latest of (target, today), padded a little.
  const t = (d) => new Date(`${d}T00:00:00`).getTime();
  const min = Math.min(...rows.map((r) => t(r.start)));
  const max = Math.max(t(today), ...rows.map((r) => t(r.end ?? today)));
  const pad = Math.max(86400000 * 3, (max - min) * 0.04);
  const lo = min - pad;
  const hi = max + pad;
  const labelW = Math.min(180, Math.max(110, width * 0.22));
  const plotW = Math.max(0, width - labelW - 8);
  const x = (d) => labelW + ((t(d) - lo) / (hi - lo)) * plotW;
  const rowH = 34;
  const height = rows.length * rowH + 26;

  // Month ticks.
  const ticks = [];
  const d = new Date(lo);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() < hi) {
    ticks.push(localDate(d));
    d.setMonth(d.getMonth() + (plotW / ((hi - lo) / 2.6e9) < 36 ? 2 : 1));
  }

  return (
    <div className="timeline-chart" ref={setEl} onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Project timeline">
          {ticks.map((tk) => (
            <g key={tk}>
              <line className="viz-grid" x1={x(tk)} x2={x(tk)} y1={0} y2={height - 20} />
              <text className="viz-tick" x={x(tk)} y={height - 6} textAnchor="middle">
                {new Date(`${tk}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = i * rowH + 8;
            const x1 = x(r.start);
            const x2 = x(r.end ?? today);
            const late = r.end && r.end < today && r.p.status !== 'Done';
            const ms = milestones.filter((m) => m.project_id === r.p.id);
            const days = daysBetween(r.start, r.end ?? today);
            return (
              <g key={r.p.id}>
                <foreignObject x={0} y={y - 2} width={labelW - 10} height={rowH - 6}>
                  <Link to={`/projects/${r.p.id}`} className="timeline-label" title={r.p.name}>
                    <ProjectAvatar project={r.p} size="sm" />
                    <span>{r.p.name}</span>
                  </Link>
                </foreignObject>
                <rect
                  className={`timeline-bar ${r.open ? 'open' : ''} ${late ? 'late' : ''}`}
                  x={x1}
                  y={y + 4}
                  width={Math.max(4, x2 - x1)}
                  height={rowH - 18}
                  rx={(rowH - 18) / 2}
                  onPointerMove={() =>
                    setTip({
                      x: Math.min(width - 200, x1),
                      y: y - 30,
                      text: `${shortDate(r.start)} → ${r.end ? shortDate(r.end) : 'no target yet'} · ${days} days${late ? ' · past target' : ''}`,
                    })
                  }
                />
                {ms.map((m) => {
                  const mx = x(m.timestamp.slice(0, 10));
                  const my = y + 4 + (rowH - 18) / 2;
                  return (
                    <rect
                      key={m.id}
                      className="timeline-milestone"
                      x={mx - 5}
                      y={my - 5}
                      width={10}
                      height={10}
                      transform={`rotate(45 ${mx} ${my})`}
                      onPointerMove={() => setTip({ x: Math.min(width - 200, mx), y: y - 30, text: `◆ ${m.title} · ${shortDate(m.timestamp)}` })}
                    />
                  );
                })}
              </g>
            );
          })}
          <line className="timeline-today" x1={x(today)} x2={x(today)} y1={0} y2={height - 20} />
          <text className="timeline-today-label" x={x(today) + 4} y={10}>
            Today
          </text>
        </svg>
      )}
      {tip && (
        <div className="viz-tooltip" style={{ left: tip.x, top: Math.max(0, tip.y) }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
