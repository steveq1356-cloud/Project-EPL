import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { PROJECT_STATUSES, PROJECT_TEMPLATES } from '../constants.js';
import { localDate } from '../utils/format.js';
import { useData } from './DataContext.jsx';
import Modal from './Modal.jsx';

export default function NewProjectDialog({ onClose }) {
  const navigate = useNavigate();
  const { changed } = useData();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [template, setTemplate] = useState('hardware');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const project = await api.projects.create({ name, status, template, start_date: status === 'Active' ? localDate() : null });
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
        <fieldset className="template-picker">
          <legend>Start from</legend>
          {PROJECT_TEMPLATES.map((t) => (
            <label key={t.id} className={`template-option ${template === t.id ? 'selected' : ''}`}>
              <input type="radio" name="template" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id)} />
              <span>
                <strong>{t.label}</strong>
                <span className="muted small">{t.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="muted small">You can add, hide and reorder sections any time.</p>
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
