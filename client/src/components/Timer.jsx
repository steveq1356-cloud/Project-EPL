import { Pause, Play, Square, Timer as TimerIcon } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { useData } from './DataContext.jsx';
import Modal from './Modal.jsx';
import { useToasts } from './Toasts.jsx';

const KEY = 'epl-timer';
const TimerContext = createContext(null);

// { projectId, startedAt, pausedMs, pausedAt } — kept in this browser so a reload doesn't lose it.
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

function save(t) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    // not saved — fine
  }
}

const elapsedMs = (t, now = Date.now()) => (t ? (t.pausedAt ?? now) - t.startedAt - t.pausedMs : 0);

export function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatMinutes(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

function SaveSession({ timer, minutes: initial, onClose, onDiscard }) {
  const { projects, changed } = useData();
  const { notify } = useToasts();
  const project = projects.find((p) => p.id === timer.projectId);
  const [minutes, setMinutes] = useState(initial);
  const [title, setTitle] = useState('Work session');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.log.create(timer.projectId, { title, body, type: 'Note', minutes, timestamp: new Date(timer.startedAt).toISOString() });
      notify(`Logged ${formatMinutes(minutes)} on ${project?.name ?? 'the project'}`);
      changed();
      window.dispatchEvent(new CustomEvent('epl:added', { detail: { projectId: timer.projectId, list: 'log' } }));
      onClose();
    } catch (err) {
      notify(err.message, { error: true });
      setSaving(false);
    }
  }

  return (
    <Modal title={`Log this session${project ? ` on ${project.name}` : ''}?`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="session-time">
          <label>
            Minutes
            <input type="number" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <span className="muted">{formatMinutes(minutes)}</span>
        </div>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          <span>
            What did you get done? <span className="muted">(optional)</span>
          </span>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Printed the bracket, re-tapped the M3 holes…" />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost danger-text" onClick={onDiscard}>
            Discard
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !minutes || !title.trim()}>
            {saving ? 'Saving…' : 'Save to notebook'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// A work timer for one project at a time; stopping it offers to log the session.
export function TimerProvider({ children }) {
  const [timer, setTimer] = useState(load);
  const [now, setNow] = useState(Date.now());
  const [stopped, setStopped] = useState(null); // { timer, minutes }

  useEffect(() => save(timer), [timer]);

  useEffect(() => {
    if (!timer || timer.pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const value = {
    timer,
    elapsed: elapsedMs(timer, now),
    start: (projectId) => setTimer({ projectId, startedAt: Date.now(), pausedMs: 0, pausedAt: null }),
    pause: () => setTimer((t) => t && !t.pausedAt && { ...t, pausedAt: Date.now() }),
    resume: () => setTimer((t) => t && t.pausedAt && { ...t, pausedMs: t.pausedMs + (Date.now() - t.pausedAt), pausedAt: null }),
    stop: () => {
      if (!timer) return;
      setStopped({ timer, minutes: Math.max(1, Math.round(elapsedMs(timer) / 60000)) });
      setTimer(null);
    },
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
      {stopped && <SaveSession timer={stopped.timer} minutes={stopped.minutes} onClose={() => setStopped(null)} onDiscard={() => setStopped(null)} />}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);

// The running timer, pinned to the bottom of the sidebar.
export function TimerPill() {
  const { timer, elapsed, pause, resume, stop } = useTimer();
  const { projects } = useData();
  if (!timer) return null;
  const project = projects.find((p) => p.id === timer.projectId);
  return (
    <div className={`timer-pill ${timer.pausedAt ? 'paused' : ''}`}>
      <TimerIcon size={15} aria-hidden />
      <div className="timer-info">
        <span className="timer-time">{formatDuration(elapsed)}</span>
        {project && (
          <Link to={`/projects/${project.id}`} className="timer-project">
            {project.name}
          </Link>
        )}
      </div>
      {timer.pausedAt ? (
        <button className="icon-btn small" onClick={resume} title="Resume" aria-label="Resume timer">
          <Play size={14} />
        </button>
      ) : (
        <button className="icon-btn small" onClick={pause} title="Pause" aria-label="Pause timer">
          <Pause size={14} />
        </button>
      )}
      <button className="icon-btn small" onClick={stop} title="Stop and log" aria-label="Stop timer">
        <Square size={13} />
      </button>
    </div>
  );
}

// Start / stop button for a project's header.
export function TimerButton({ projectId }) {
  const { timer, elapsed, start, stop } = useTimer();
  const mine = timer?.projectId === projectId;
  if (mine) {
    return (
      <button className="btn btn-small timer-btn running" onClick={stop} title="Stop and log this session">
        <Square size={12} aria-hidden /> {formatDuration(elapsed)}
      </button>
    );
  }
  return (
    <button className="btn btn-small timer-btn" onClick={() => start(projectId)} disabled={Boolean(timer)} title={timer ? 'A timer is already running on another project' : 'Time a work session'}>
      <Play size={12} aria-hidden /> Start timer
    </button>
  );
}
