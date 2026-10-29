import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { PROJECT_STATUSES } from '../constants.js';
import { useData } from './DataContext.jsx';
import Modal from './Modal.jsx';

export default function NewProjectDialog({ onClose }) {
  const navigate = useNavigate();
  const { changed } = useData();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const project = await api.projects.create({ name, status, summary, start_date: status === 'Active' ? new Date().toISOString().slice(0, 10) : null });
      changed();
      onClose();
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Desk Lamp" />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>
            Summary <span className="muted">(optional)</span>
          </span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line about what it is" />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
