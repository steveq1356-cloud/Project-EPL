// Decorative accent colors for projects (avatars, cover art, section icons).
// Never used for chart data — charts keep their validated --viz-* colors.
export const PROJECT_COLORS = {
  indigo: '#5b5bd6',
  blue: '#2f6fdb',
  sky: '#0b8bc6',
  teal: '#0f9488',
  emerald: '#16a061',
  lime: '#6a9a12',
  amber: '#d48a06',
  orange: '#e0661b',
  rose: '#dc3d64',
  violet: '#8b4fd8',
};

const NAMES = Object.keys(PROJECT_COLORS);

export const colorName = (project) => project?.color || NAMES[((project?.id ?? 1) * 7) % NAMES.length];
export const colorFor = (project) => PROJECT_COLORS[colorName(project)];

export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

// Small deterministic random numbers from a string, for generated cover art.
export function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
