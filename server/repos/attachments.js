import path from 'node:path';
import { getDb } from '../db/connection.js';
import { removeUploadFiles } from '../uploads.js';

const MODEL_EXTS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'step', 'stp', 'iges', 'igs', 'ply'];

// What the UI can do with a file: 'model' (3D viewer), 'pdf', 'image', or 'file'.
export function fileKind(name, mime = '') {
  const ext = path.extname(name).slice(1).toLowerCase();
  if (MODEL_EXTS.includes(ext)) return 'model';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'file';
}

export const withUrls = (row) =>
  row && {
    ...row,
    ext: path.extname(row.original_name).slice(1).toLowerCase(),
    kind: fileKind(row.original_name, row.mime),
    url: `/uploads/originals/${row.stored_name}`,
    download_url: `/api/attachments/${row.id}/download`,
  };

export function getAttachment(id) {
  return withUrls(getDb().prepare('SELECT * FROM attachments WHERE id = ?').get(id));
}

export function createAttachment(projectId, file) {
  const { lastInsertRowid } = getDb()
    .prepare('INSERT INTO attachments (project_id, stored_name, original_name, mime, size_bytes) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, file.filename, file.originalname, file.mimetype || 'application/octet-stream', file.size);
  return getAttachment(lastInsertRowid);
}

export function deleteAttachment(id) {
  const row = getAttachment(id);
  if (!row) return false;
  getDb().prepare('DELETE FROM attachments WHERE id = ?').run(id);
  removeUploadFiles(row.stored_name);
  return true;
}
