import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useTheme } from './hooks/useTheme.js';
import NewProjectDialog from './components/NewProjectDialog.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectPage from './pages/ProjectPage.jsx';

export default function App() {
  const { theme, cycle } = useTheme();
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <BrowserRouter>
      <header className="topbar">
        <Link className="brand" to="/">EPL</Link>
        <span className="muted topbar-subtitle">Engineering Project Log</span>
        <div className="spacer" />
        <button className="btn" onClick={() => setNewProjectOpen(true)}>
          + Project
        </button>
        <button className="btn" onClick={cycle} title="Switch theme (system → light → dark)">
          Theme: {theme}
        </button>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard onNewProject={() => setNewProjectOpen(true)} />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/:tab" element={<ProjectPage />} />
        <Route
          path="*"
          element={
            <main className="page">
              <p>Page not found. <Link to="/">Back to dashboard</Link></p>
            </main>
          }
        />
      </Routes>

      {newProjectOpen && <NewProjectDialog onClose={() => setNewProjectOpen(false)} />}
    </BrowserRouter>
  );
}
