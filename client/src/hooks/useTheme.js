import { useEffect, useState } from 'react';

const KEY = 'epl-appearance';
const OLD_THEME_KEY = 'epl-theme';

export const THEMES = [
  { id: 'system', label: 'Auto', description: 'Follows your computer', swatch: ['#f7f7f5', '#1b1e23'] },
  { id: 'light', label: 'Light', description: 'Clean paper', swatch: ['#f7f7f5', '#ffffff'] },
  { id: 'dark', label: 'Dark', description: 'Easy on the eyes', swatch: ['#111316', '#1b1e23'] },
  { id: 'blueprint', label: 'Blueprint', description: 'Drafting-table navy', swatch: ['#0b1f38', '#123058'] },
  { id: 'midnight', label: 'Midnight', description: 'True black', swatch: ['#000000', '#0d0d0f'] },
];

// Accent colors as [light-theme value, dark-theme value]; 'default' uses each theme's own.
export const ACCENTS = {
  default: null,
  indigo: ['#4f46e5', '#a5b4fc'],
  teal: ['#0f766e', '#5eead4'],
  emerald: ['#047857', '#6ee7b7'],
  violet: ['#7c3aed', '#c4b5fd'],
  rose: ['#be123c', '#fda4af'],
  amber: ['#b45309', '#fcd34d'],
};

const DEFAULTS = { theme: 'system', accent: 'default', density: 'comfortable', celebrations: true };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return { ...DEFAULTS, ...saved };
    const oldTheme = localStorage.getItem(OLD_THEME_KEY);
    return { ...DEFAULTS, theme: oldTheme || 'system' };
  } catch {
    return DEFAULTS;
  }
}

// Read by celebrate() so confetti respects the setting without prop drilling.
export const celebrationsOn = () => load().celebrations;

const isDark = (theme) => theme === 'dark' || theme === 'blueprint' || theme === 'midnight' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

// Theme, accent color, density and celebrations — saved in this browser.
export function useTheme() {
  const [appearance, setAppearance] = useState(load);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const { theme, accent, density } = appearance;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    root.setAttribute('data-density', density);

    const pair = ACCENTS[accent];
    if (pair) {
      const dark = isDark(theme);
      root.style.setProperty('--accent', pair[dark ? 1 : 0]);
      root.style.setProperty('--accent-soft', `color-mix(in srgb, ${pair[dark ? 1 : 0]} ${dark ? 18 : 11}%, var(--surface))`);
      root.style.setProperty('--accent-contrast', dark ? '#0b0f17' : '#ffffff');
    } else {
      ['--accent', '--accent-soft', '--accent-contrast'].forEach((p) => root.style.removeProperty(p));
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(appearance));
    } catch {
      // storage unavailable — settings just won't persist
    }
  }, [appearance, systemDark]);

  const update = (fields) => setAppearance((a) => ({ ...a, ...fields }));
  const cycle = () => update({ theme: appearance.theme === 'system' ? 'light' : appearance.theme === 'light' ? 'dark' : 'system' });
  return { theme: appearance.theme, cycle, appearance, update };
}
