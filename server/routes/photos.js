import { Router } from 'express';
import * as photos from '../repos/photos.js';
import { getProject } from '../repos/projects.js';
import { imageUpload, makeThumbnail, removeUploadFiles } from '../uploads.js';

// Mounted at /api.
const router = Router();

router.get('/projects/:projectId/photos', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
  res.json(photos.listPhotos(projectId));
});

// multipart/form-data: one or more `files`, optional `log_entry_id` and `caption`.
router.post('/projects/:projectId/photos', imageUpload.array('files'), async (req, res) => {
  const projectId = Number(req.params.projectId);
  const files = req.files ?? [];
  try {
    if (!getProject(projectId)) return res.status(404).json({ error: 'Project not found' });
    if (!files.length) return res.status(400).json({ error: 'No images were uploaded' });

    const created = [];
    for (const file of files) {
      const { width, height } = await makeThumbnail(file.filename);
      created.push(
        photos.createPhoto({
          projectId,
          logEntryId: req.body.log_entry_id ? Number(req.body.log_entry_id) : null,
          storedName: file.filename,
          originalName: file.originalname,
          mime: file.mimetype,
          width,
          height,
          caption: req.body.caption ?? '',
        }),
      );
    }
    res.status(201).json(created);
  } catch (err) {
    // Don't leave files on disk for photos that never made it into the database.
    const saved = new Set(photos.listPhotos(projectId).map((p) => p.stored_name));
    files.filter((f) => !saved.has(f.filename)).forEach((f) => removeUploadFiles(f.filename));
    throw err;
  }
});

router.patch('/photos/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!photos.getPhoto(id)) return res.status(404).json({ error: 'Photo not found' });
  res.json(photos.updatePhoto(id, req.body ?? {}));
});

router.delete('/photos/:id', (req, res) => {
  if (!photos.deletePhoto(Number(req.params.id))) return res.status(404).json({ error: 'Photo not found' });
  res.status(204).end();
});

export default router;
