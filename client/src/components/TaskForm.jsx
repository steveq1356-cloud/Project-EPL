import { useState } from 'react';
import { api } from '../api/index.js';
import { PRIORITIES } from '../constants.js';

// One-line task entry. Priority and due date appear once you start typing. Enter saves.
export default function TaskForm({ projectId, onSaved, autoFocus = false, placeholder = 'Add a task…' }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [due, setDue] = useState('');
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setError(null);
    try {
      const task = await api.tasks.create(projectId, { title, priority, due_date: due || null });
      setTitle('');
      setDue('');
      setPriority('Medium');
      onSaved(task);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className={`task-form ${title ? 'has-text' : ''}`} onSubmit={submit}>
      <span className="task-form-box" aria-hidden />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} aria-label="Task title" />
      {title && (
        <>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className={`p-${priority.toLowerCase()}`}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <button className="btn btn-small btn-primary">Add</button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
