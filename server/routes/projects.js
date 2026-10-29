import { Router } from 'express';
import * as projects from '../repos/projects.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(projects.listProjects());
});

router.get('/:id', (req, res) => {
  const project = projects.getProject(Number(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

export default router;
