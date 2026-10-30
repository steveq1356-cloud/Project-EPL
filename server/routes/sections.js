import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { addToLayout, getProject, removeFromLayout } from '../repos/projects.js';
import * as sections from '../repos/sections.js';

// Mounted at /api: custom project sections and app-wide settings.
const router = Router();

router.get('/projects/:projectId/sections', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  res.json(sections.listSections(projectId));
});

// Creates the section and places it in the page layout (body.index, or at the end).
router.post('/projects/:projectId/sections', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  const section = getDb().transaction(() => {
    const s = sections.createSection(projectId, req.body ?? {});
    addToLayout(projectId, `custom:${s.id}`, Number.isInteger(req.body?.index) ? req.body.index : null);
    return s;
  })();
  res.status(201).json({ section, project: getProject(projectId) });
});

router.patch('/sections/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!sections.getSection(id)) return res.status(404).json({ error: 'Section not found' });
  res.json(sections.updateSection(id, req.body ?? {}));
});

router.delete('/sections/:id', (req, res) => {
  const section = sections.getSection(Number(req.params.id));
  if (!section) return res.status(404).json({ error: 'Section not found' });
  getDb().transaction(() => {
    sections.deleteSection(section.id);
    removeFromLayout(section.project_id, `custom:${section.id}`);
  })();
  res.status(204).end();
});

// ---- settings (key → JSON value) ----

router.get('/settings', (req, res) => {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)])));
});

router.patch('/settings', (req, res) => {
  const upsert = getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  getDb().transaction(() => {
    for (const [key, value] of Object.entries(req.body ?? {})) upsert.run(key, JSON.stringify(value));
  })();
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)])));
});

export default router;
