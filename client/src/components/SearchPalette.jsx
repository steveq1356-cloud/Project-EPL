import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { money } from '../utils/format.js';
import { useData } from './DataContext.jsx';
import Modal from './Modal.jsx';

const KINDS = {
  project: { label: 'Projects', icon: '▣' },
  log: { label: 'Log entries', icon: '✎' },
  task: { label: 'Tasks', icon: '☐' },
  purchase: { label: 'Purchases', icon: '$' },
  link: { label: 'Links & files', icon: '↗' },
  photo: { label: 'Photos', icon: '▨' },
};

// Where a result lives on its project page (the page scrolls to and highlights it).
const anchor = (r) => (r.kind === 'project' ? '' : `#${r.kind}-${r.id}`);

// Wraps each matched term in <mark>. Text is rendered as React children, never as HTML.
function Highlight({ text, terms }) {
  if (!text || !terms.length) return text || null;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

export default function SearchPalette({ onClose }) {
  const navigate = useNavigate();
  const { projects } = useData();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const terms = useMemo(() => q.trim().split(/\s+/).filter(Boolean), [q]);

  useEffect(() => {
    if (!terms.length) return setResults([]);
    const t = setTimeout(() => {
      api.search(q).then((r) => {
        setResults(r);
        setActive(0);
      });
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  // With no query, offer the projects themselves.
  const shown = terms.length ? results : projects.map((p) => ({ kind: 'project', id: p.id, project_id: p.id, title: p.name, snippet: p.summary, detail: p.status }));

  function go(r) {
    onClose();
    navigate(`/projects/${r.project_id}${anchor(r)}`);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && shown[active]) {
      e.preventDefault();
      go(shown[active]);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('.search-result.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let index = -1;
  const groups = Object.keys(KINDS)
    .map((kind) => ({ kind, items: shown.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length);

  return (
    <Modal title="Search" onClose={onClose} className="search-modal">
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <input
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search log entries, tasks, purchases, links, photos…"
          aria-label="Search"
        />
      </form>
      <div className="search-results" ref={listRef}>
        {terms.length > 0 && results.length === 0 && <p className="muted empty-state">No matches for “{q}”.</p>}
        {groups.map((g) => (
          <div key={g.kind} className="search-group">
            <div className="search-group-label">{KINDS[g.kind].label}</div>
            {g.items.map((r) => {
              index++;
              const i = index;
              return (
                <button key={`${r.kind}-${r.id}`} className={`search-result ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                  <span className="search-icon" aria-hidden>
                    {KINDS[r.kind].icon}
                  </span>
                  <span className="search-text">
                    <span className="search-title">
                      <Highlight text={r.title} terms={terms} />
                    </span>
                    {r.snippet && (
                      <span className="search-snippet">
                        <Highlight text={r.snippet} terms={terms} />
                      </span>
                    )}
                  </span>
                  <span className="search-meta">
                    {r.kind !== 'project' && <span>{r.project_name}</span>}
                    {r.detail && <span className="chip-static">{r.detail}</span>}
                    {r.total_cents != null && <span className="mono">{money(r.total_cents)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="muted small search-hint">
        <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
      </p>
    </Modal>
  );
}
