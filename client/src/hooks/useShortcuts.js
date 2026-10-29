import { useEffect, useRef } from 'react';

const typing = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// Single-key shortcuts (ignored while typing or while a dialog is open).
// `g` then another key works as a two-key sequence, e.g. "g d".
export function useShortcuts(map) {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    let prefix = null;
    let timer;
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('dialog[open]')) return;
      const key = prefix ? `${prefix} ${e.key.toLowerCase()}` : e.key === '?' ? '?' : e.key.toLowerCase();
      if (!prefix && key === 'g') {
        prefix = 'g';
        clearTimeout(timer);
        timer = setTimeout(() => (prefix = null), 1000);
        return;
      }
      prefix = null;
      const action = mapRef.current[key];
      if (action) {
        e.preventDefault();
        action();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, []);
}

export const SHORTCUTS = [
  ['/', 'Search everything'],
  ['N', 'New log entry'],
  ['P', 'New purchase'],
  ['T', 'New task'],
  ['G then D', 'Go to dashboard'],
  ['G then 1–9', 'Go to project 1–9 in the sidebar'],
  ['?', 'Show these shortcuts'],
  ['Ctrl+Enter', 'Save the form you are in'],
  ['Esc', 'Close a dialog / cancel editing'],
];
