import { Router } from 'express';
import { projectsWithStats } from '../repos/insights.js';
import * as projects from '../repos/projects.js';

const router = Router();

// Includes per-project stats (spend, task counts, last activity, stale flag) for the sidebar and cards.
router.get('/', (req, res) => {
  res.json(projectsWithStats());
});

router.get('/tags', (req, res) => {
  res.json(projects.listTags());
});

router.post('/', (req, res) => {
  res.status(201).json(projects.createProject(req.body ?? {}));
});

router.get('/:id', (req, res) => {
  const project = projects.getProject(Number(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!projects.getProject(id)) return res.status(404).json({ error: 'Project not found' });
  res.json(projects.updateProject(id, req.body ?? {}));
});

router.delete('/:id', (req, res) => {
  if (!projects.deleteProject(Number(req.params.id))) return res.status(404).json({ error: 'Project not found' });
  res.status(204).end();
});

export default router;
