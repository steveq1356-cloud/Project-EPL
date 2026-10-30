import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { useShortcuts, SHORTCUTS } from './hooks/useShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { DataProvider, useData } from './components/DataContext.jsx';
import Modal from './components/Modal.jsx';
import NewProjectDialog from './components/NewProjectDialog.jsx';
import QuickAdd from './components/QuickAdd.jsx';
import SearchPalette from './components/SearchPalette.jsx';
import Sidebar, { sidebarOrder } from './components/Sidebar.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectPage from './pages/ProjectPage.jsx';

function Shell() {
  const { theme, cycle } = useTheme();
  const { projects } = useData();
  const navigate = useNavigate();
  const projectMatch = useMatch('/projects/:id');
  const currentProject = projectMatch ? Number(projectMatch.params.id) : null;
  const [dialog, setDialog] = useState(null); // 'search' | 'help' | 'project' | { quickAdd: kind }
  const [navOpen, setNavOpen] = useState(false);

  const quickAdd = (kind) => setDialog({ quickAdd: kind });
  const goto = Object.fromEntries(sidebarOrder(projects).slice(0, 9).map((p, i) => [`g ${i + 1}`, () => navigate(`/projects/${p.id}`)]));

  useShortcuts({
    '/': () => setDialog('search'),
    n: () => quickAdd('log'),
    p: () => quickAdd('purchase'),
    t: () => quickAdd('task'),
    '?': () => setDialog('help'),
    'g d': () => navigate('/'),
    ...goto,
  });

  return (
    <div className="shell">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        theme={theme}
        onTheme={cycle}
        onSearch={() => setDialog('search')}
        onQuickAdd={() => quickAdd('log')}
        onNewProject={() => setDialog('project')}
        onHelp={() => setDialog('help')}
      />
      <button className="nav-toggle btn" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
        ☰
      </button>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

      <div className="shell-main">
        <Routes>
          <Route path="/" element={<Dashboard onQuickAdd={quickAdd} onNewProject={() => setDialog('project')} />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/projects/:id/:tab" element={<ProjectPage />} />
          <Route
            path="*"
            element={
              <main className="page">
                <p>
                  Page not found. <Link to="/">Back to dashboard</Link>
                </p>
              </main>
            }
          />
        </Routes>
      </div>

      {dialog === 'search' && <SearchPalette onClose={() => setDialog(null)} />}
      {dialog === 'project' && <NewProjectDialog onClose={() => setDialog(null)} />}
      {dialog?.quickAdd && <QuickAdd kind={dialog.quickAdd} projectId={currentProject} onClose={() => setDialog(null)} />}
      {dialog === 'help' && (
        <Modal title="Keyboard shortcuts" onClose={() => setDialog(null)}>
          <dl className="shortcut-list">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys}>
                <dt>
                  {keys.split(' then ').map((k, i) => (
                    <span key={k}>
                      {i > 0 && <span className="muted"> then </span>}
                      <kbd>{k}</kbd>
                    </span>
                  ))}
                </dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <DataProvider>
          <Shell />
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
