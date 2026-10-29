import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// EPL_DATA_DIR lets you keep the data somewhere else (e.g. outside a synced folder).
export const DATA_DIR = path.resolve(process.env.EPL_DATA_DIR || path.join(ROOT_DIR, 'data'));
export const DB_PATH = path.join(DATA_DIR, 'epl.db');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
export const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');
export const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');
export const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');

export const HOST = '127.0.0.1'; // localhost only — never reachable from other devices
export const PORT = Number(process.env.PORT) || 3001;
