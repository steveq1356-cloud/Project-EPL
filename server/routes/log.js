import { Router } from 'express';
import * as log from '../repos/logEntries.js';
import { getProject } from '../repos/projects.js';

// Mounted at /api: project-scoped list/create plus per-entry edit/delete.
const router = Router();

router.get('/projects/:projectId/log', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  res.json(log.listLogEntries(projectId));
});

router.post('/projects/:projectId/log', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  res.status(201).json(log.createLogEntry(projectId, req.body ?? {}));
});

router.get('/log/:id', (req, res) => {
  const entry = log.getLogEntry(Number(req.params.id));
  if (!entry) return res.status(404).json({ error: 'Log entry not found' });
  res.json(entry);
});

router.patch('/log/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!log.getLogEntry(id)) return res.status(404).json({ error: 'Log entry not found' });
  res.json(log.updateLogEntry(id, req.body ?? {}));
});

router.delete('/log/:id', (req, res) => {
  if (!log.deleteLogEntry(Number(req.params.id))) return res.status(404).json({ error: 'Log entry not found' });
  res.status(204).end();
});

export default router;
