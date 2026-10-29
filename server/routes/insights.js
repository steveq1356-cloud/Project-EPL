import { Router } from 'express';
import * as insights from '../repos/insights.js';
import { getProject } from '../repos/projects.js';

// Mounted at /api.
const router = Router();

router.get('/dashboard', (req, res) => res.json(insights.dashboard()));

router.get('/search', (req, res) => res.json(insights.search(req.query.q)));

router.get('/projects/:projectId/insights', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  const stats = insights.projectStats()[projectId];
  res.json({
    stats,
    activity_by_day: insights.activityByDay({ projectId, days: 182 }),
    recent: insights.activity({ projectId, limit: 15 }),
  });
});

export default router;
