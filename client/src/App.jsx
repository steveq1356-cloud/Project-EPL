import { useEffect, useState } from 'react';
import { api } from './api/index.js';
import { useTheme } from './hooks/useTheme.js';

const statusClass = (status) => `status status-${status.toLowerCase().replace(/\s+/g, '-')}`;

export default function App() {
  const { theme, cycle } = useTheme();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.projects.list().then(setProjects).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">EPL</a>
        <span className="muted">Engineering Project Log</span>
        <div className="spacer" />
        <button className="btn" onClick={cycle} title="Switch theme">
          Theme: {theme}
        </button>
      </header>

      <main className="page">
        <h1>Projects</h1>
        {error && <p className="error">Couldn't load projects: {error}</p>}
        {!projects && !error && <p className="muted">Loading…</p>}
        {projects && (
          <div className="card-grid">
            {projects.map((p) => (
              <article key={p.id} className="card">
                <h2>{p.name}</h2>
                <span className={statusClass(p.status)}>{p.status}</span>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
