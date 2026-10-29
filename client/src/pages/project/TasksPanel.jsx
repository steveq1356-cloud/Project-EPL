import { useState } from 'react';
import { api } from '../../api/index.js';
import InlineText from '../../components/InlineText.jsx';
import TaskForm from '../../components/TaskForm.jsx';
import { useToasts } from '../../components/Toasts.jsx';
import { PRIORITIES } from '../../constants.js';
import { localDate, shortDate } from '../../utils/format.js';

const ORDER = { High: 0, Medium: 1, Low: 2 };
const sortTasks = (list) =>
  [...list].sort(
    (a, b) =>
      a.done - b.done ||
      (a.done ? (b.completed_at ?? '').localeCompare(a.completed_at ?? '') : ORDER[a.priority] - ORDER[b.priority] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
  );

function TaskRow({ task, onUpdate, onRemove }) {
  const today = localDate();
  const overdue = !task.done && task.due_date && task.due_date < today;
  return (
    <li id={`task-${task.id}`} className={`task-row ${task.done ? 'done' : ''}`}>
      <input type="checkbox" checked={task.done} onChange={() => onUpdate(task, { done: !task.done })} aria-label={task.done ? 'Mark not done' : 'Mark done'} />
      <span className="task-title">
        <InlineText value={task.title} onSave={(title) => onUpdate(task, { title })} required />
      </span>
      <span className="task-meta">
        <button
          className={`priority-pick p-${task.priority.toLowerCase()}`}
          onClick={() => onUpdate(task, { priority: PRIORITIES[(PRIORITIES.indexOf(task.priority) + 1) % PRIORITIES.length] })}
          title={`${task.priority} priority — click to change`}
          aria-label={`${task.priority} priority`}
        >
          <span className="priority-dot" />
          {task.priority[0]}
        </button>
        <label className={`due-pick ${overdue ? 'overdue' : ''} ${task.due_date ? '' : 'empty'}`} title="Due date">
          <span>{task.done ? shortDate(task.completed_at) : task.due_date ? `${overdue ? 'Overdue · ' : ''}${shortDate(task.due_date)}` : 'due'}</span>
          {!task.done && <input type="date" value={task.due_date ?? ''} onChange={(e) => onUpdate(task, { due_date: e.target.value || null })} />}
        </label>
        <button className="row-remove" onClick={() => onRemove(task)} aria-label={`Delete ${task.title}`}>
          ×
        </button>
      </span>
    </li>
  );
}

export default function TasksPanel({ projectId, tasks, setTasks, onChanged }) {
  const { deleteWithUndo, notify } = useToasts();
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  async function update(task, fields) {
    setTasks((list) => sortTasks(list.map((t) => (t.id === task.id ? { ...t, ...fields } : t))));
    try {
      const saved = await api.tasks.update(task.id, fields);
      setTasks((list) => sortTasks(list.map((t) => (t.id === saved.id ? saved : t))));
      onChanged();
    } catch (e) {
      setTasks((list) => list.map((t) => (t.id === task.id ? task : t)));
      notify(e.message, { error: true });
    }
  }

  function remove(task) {
    setTasks((list) => list.filter((t) => t.id !== task.id));
    deleteWithUndo(`Deleted task “${task.title}”`, {
      commit: async () => {
        await api.tasks.remove(task.id);
        onChanged();
      },
      undo: () => setTasks((list) => sortTasks([...list, task])),
    });
  }

  return (
    <section className="card panel tasks-panel" id="tasks">
      <header className="panel-head">
        <h3>Tasks</h3>
        <span className="muted small">
          {open.length} open · {done.length} done
        </span>
      </header>
      <TaskForm
        projectId={projectId}
        onSaved={(t) => {
          setTasks((list) => sortTasks([...list, t]));
          onChanged();
        }}
      />
      {open.length === 0 && <p className="muted small empty-state">Nothing open.</p>}
      <ul className="task-list">
        {open.map((t) => (
          <TaskRow key={t.id} task={t} onUpdate={update} onRemove={remove} />
        ))}
      </ul>
      {done.length > 0 && (
        <>
          <button className="link-btn" onClick={() => setShowDone((s) => !s)}>
            {showDone ? 'Hide' : 'Show'} {done.length} done
          </button>
          {showDone && (
            <ul className="task-list">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onUpdate={update} onRemove={remove} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
