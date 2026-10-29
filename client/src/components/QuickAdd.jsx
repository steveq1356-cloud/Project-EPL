import { useState } from 'react';
import { useToasts } from './Toasts.jsx';
import { useData } from './DataContext.jsx';
import LogEntryForm from './LogEntryForm.jsx';
import Modal from './Modal.jsx';
import PurchaseForm from './PurchaseForm.jsx';
import TaskForm from './TaskForm.jsx';

const KINDS = [
  { id: 'log', label: 'Log entry', key: 'N' },
  { id: 'purchase', label: 'Purchase', key: 'P' },
  { id: 'task', label: 'Task', key: 'T' },
];
const LAST_PROJECT = 'epl-last-project';

function rememberedProject() {
  try {
    return Number(localStorage.getItem(LAST_PROJECT)) || null;
  } catch {
    return null;
  }
}

// Add a log entry, purchase or task to any project from anywhere.
export default function QuickAdd({ kind: initialKind = 'log', projectId: currentProject, onClose }) {
  const { projects, changed } = useData();
  const { notify } = useToasts();
  const [kind, setKind] = useState(initialKind);
  const [projectId, setProjectId] = useState(() => currentProject ?? rememberedProject() ?? projects.find((p) => p.status === 'Active')?.id ?? projects[0]?.id);

  function chooseProject(id) {
    setProjectId(id);
    try {
      localStorage.setItem(LAST_PROJECT, String(id));
    } catch {
      // not remembered — fine
    }
  }

  function saved(what, list) {
    const name = projects.find((p) => p.id === projectId)?.name;
    notify(`${what} added to ${name}`);
    changed();
    // An open project page listens for this and reloads that list.
    window.dispatchEvent(new CustomEvent('epl:added', { detail: { projectId, list } }));
    onClose();
  }

  return (
    <Modal title="Quick add" onClose={onClose} className="quick-add">
      <div className="quick-add-top">
        <div className="segmented" role="tablist">
          {KINDS.map((k) => (
            <button key={k.id} role="tab" aria-selected={kind === k.id} className={kind === k.id ? 'active' : ''} onClick={() => setKind(k.id)}>
              {k.label} <kbd>{k.key}</kbd>
            </button>
          ))}
        </div>
        <label className="quick-add-project">
          <span className="label">Project</span>
          <select value={projectId ?? ''} onChange={(e) => chooseProject(Number(e.target.value))}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {kind === 'log' && <LogEntryForm key={projectId} projectId={projectId} autoFocus onSaved={() => saved('Log entry', 'log')} />}
      {kind === 'purchase' && <PurchaseForm key={projectId} projectId={projectId} onSaved={() => saved('Purchase', 'purchases')} />}
      {kind === 'task' && (
        <div className="quick-task">
          <TaskForm key={projectId} projectId={projectId} autoFocus onSaved={() => saved('Task', 'tasks')} placeholder="What needs doing?" />
        </div>
      )}
    </Modal>
  );
}
