import { useMemo } from 'react';
import { colorFor, seeded } from '../utils/projectColor.js';

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// A generated, drawing-style cover for projects without a photo: a gradient in the
// project's color with a faint grid, circles with centre marks and a dimension line.
// Seeded by the project id, so each project keeps its own pattern.
export default function CoverArt({ project, className = '' }) {
  const color = colorFor(project);
  const art = useMemo(() => {
    const rand = seeded(`${project.id}:${project.name}`);
    const circles = Array.from({ length: 2 + Math.floor(rand() * 2) }, () => ({
      cx: 200 + rand() * 1200,
      cy: 120 + rand() * 560,
      r: 70 + rand() * 210,
    }));
    const rect = { x: 120 + rand() * 900, y: 160 + rand() * 300, w: 260 + rand() * 340, h: 160 + rand() * 200 };
    const dim = { y: 690 + rand() * 60, x1: 160 + rand() * 300, x2: 900 + rand() * 500 };
    return { circles, rect, dim, angle: rand() > 0.5 ? 0 : 12 };
  }, [project.id, project.name]);

  const id = `cover-${project.id}`;
  return (
    <svg className={`cover-art ${className}`} viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(color, -0.28)} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={shade(color, 0.3)} />
        </linearGradient>
        <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="1600" height="800" fill={`url(#${id}-bg)`} />
      <rect width="1600" height="800" fill={`url(#${id}-grid)`} />
      <g fill="none" stroke="#fff" strokeWidth="3" transform={`rotate(${art.angle} 800 400)`}>
        <rect x={art.rect.x} y={art.rect.y} width={art.rect.w} height={art.rect.h} rx="28" strokeOpacity="0.22" fill="#fff" fillOpacity="0.05" />
        {art.circles.map((c, i) => (
          <g key={i} strokeOpacity={0.3 - i * 0.06}>
            <circle cx={c.cx} cy={c.cy} r={c.r} fill="#fff" fillOpacity="0.045" />
            <circle cx={c.cx} cy={c.cy} r={c.r * 0.42} strokeDasharray="14 10" />
            <path d={`M${c.cx - c.r - 24} ${c.cy}H${c.cx + c.r + 24}M${c.cx} ${c.cy - c.r - 24}V${c.cy + c.r + 24}`} strokeWidth="1.5" strokeDasharray="22 8 4 8" />
          </g>
        ))}
        <g strokeOpacity="0.4" strokeWidth="2">
          <path d={`M${art.dim.x1} ${art.dim.y}H${art.dim.x2}`} />
          <path d={`M${art.dim.x1} ${art.dim.y - 22}V${art.dim.y + 22}M${art.dim.x2} ${art.dim.y - 22}V${art.dim.y + 22}`} />
          <path d={`M${art.dim.x1 + 26} ${art.dim.y - 10}L${art.dim.x1} ${art.dim.y}L${art.dim.x1 + 26} ${art.dim.y + 10}M${art.dim.x2 - 26} ${art.dim.y - 10}L${art.dim.x2} ${art.dim.y}L${art.dim.x2 - 26} ${art.dim.y + 10}`} />
        </g>
      </g>
    </svg>
  );
}
