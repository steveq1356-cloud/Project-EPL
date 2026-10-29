import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Dashboard({ onNewProject }) {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.projects.list().then(setProjects).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="page">
      <div className="page-title">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={onNewProject}>
          + New project
        </button>
      </div>

      {error && <p className="error">Couldn't load projects: {error}</p>}
      {!projects && !error && <p className="muted">Loading…</p>}
      {projects?.length === 0 && <p className="muted">No projects yet — create one to get started.</p>}
      {projects && (
        <div className="card-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card card-link">
              <div className={`card-cover ${p.cover ? '' : 'empty'}`}>
                {p.cover ? <img src={p.cover.thumb_url} alt="" loading="lazy" /> : <span>{p.name.slice(0, 1)}</span>}
              </div>
              <div className="card-top">
                <h2>{p.name}</h2>
                <StatusBadge status={p.status} />
              </div>
              {p.summary && <p className="card-summary">{p.summary}</p>}
              {p.next_action && (
                <p className="card-next">
                  <span className="label">Next</span> {p.next_action}
                </p>
              )}
              {p.tags.length > 0 && (
                <div className="tags">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
