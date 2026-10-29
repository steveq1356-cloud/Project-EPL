import { Router } from 'express';
import { createAttachment, deleteAttachment, getAttachment } from '../repos/attachments.js';
import * as links from '../repos/links.js';
import { getProject } from '../repos/projects.js';
import * as purchases from '../repos/purchases.js';
import * as tasks from '../repos/tasks.js';
import { fileUpload, removeUploadFiles } from '../uploads.js';
import { UPLOADS_DIR } from '../config.js';
import path from 'node:path';

// Mounted at /api: purchases, tasks, links and attachment downloads.
const router = Router();

function requireProject(req, res, next) {
  req.projectId = Number(req.params.projectId);
  if (!getProject(req.projectId)) return res.status(404).json({ error: 'Project not found' });
  next();
}

// GET/POST /projects/:projectId/<name> and PATCH/DELETE /<name>/:id for one resource.
function resource(name, { list, create, get, update, remove }) {
  router.get(`/projects/:projectId/${name}`, requireProject, (req, res) => res.json(list(req.projectId)));
  router.post(`/projects/:projectId/${name}`, requireProject, (req, res) => res.status(201).json(create(req.projectId, req.body ?? {})));
  router.patch(`/${name}/:id`, (req, res) => {
    const id = Number(req.params.id);
    if (!get(id)) return res.status(404).json({ error: 'Not found' });
    res.json(update(id, req.body ?? {}));
  });
  router.delete(`/${name}/:id`, (req, res) => {
    if (!remove(Number(req.params.id))) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });
}

resource('purchases', {
  list: purchases.listPurchases,
  create: purchases.createPurchase,
  get: purchases.getPurchase,
  update: purchases.updatePurchase,
  remove: purchases.deletePurchase,
});

resource('tasks', {
  list: tasks.listTasks,
  create: tasks.createTask,
  get: tasks.getTask,
  update: tasks.updateTask,
  remove: tasks.deleteTask,
});

// Links: JSON for a URL, or multipart with a `file` (plus the same fields) for an upload.
router.get('/projects/:projectId/links', requireProject, (req, res) => res.json(links.listLinks(req.projectId)));
router.post('/projects/:projectId/links', requireProject, fileUpload.single('file'), (req, res) => {
  const body = { ...req.body };
  if ('featured' in body) body.featured = body.featured === true || body.featured === 'true' || body.featured === '1';
  let attachment = null;
  try {
    if (req.file) {
      attachment = createAttachment(req.projectId, req.file);
      if (!body.label) body.label = req.file.originalname;
    }
    res.status(201).json(links.createLink(req.projectId, body, attachment));
  } catch (err) {
    if (attachment) deleteAttachment(attachment.id);
    else if (req.file) removeUploadFiles(req.file.filename);
    throw err;
  }
});
router.patch('/links/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!links.getLink(id)) return res.status(404).json({ error: 'Not found' });
  res.json(links.updateLink(id, req.body ?? {}));
});
router.delete('/links/:id', (req, res) => {
  if (!links.deleteLink(Number(req.params.id))) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// Receipt for a purchase (any file type); replaces an existing receipt.
router.post('/purchases/:id/receipt', fileUpload.single('file'), (req, res) => {
  const purchase = purchases.getPurchase(Number(req.params.id));
  if (!purchase) {
    if (req.file) removeUploadFiles(req.file.filename);
    return res.status(404).json({ error: 'Not found' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const attachment = createAttachment(purchase.project_id, req.file);
  res.json(purchases.setReceipt(purchase.id, attachment.id));
});
router.delete('/purchases/:id/receipt', (req, res) => {
  const purchase = purchases.getPurchase(Number(req.params.id));
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchases.setReceipt(purchase.id, null));
});

router.get('/purchases/meta', (req, res) => {
  res.json({ categories: purchases.listCategories(), vendors: purchases.listVendors() });
});

// Downloads a file under its original name.
router.get('/attachments/:id/download', (req, res) => {
  const file = getAttachment(Number(req.params.id));
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.download(path.join(UPLOADS_DIR, 'originals', file.stored_name), file.original_name);
});

export default router;
