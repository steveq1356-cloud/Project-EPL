// Zips the database and all uploads into backups/epl-YYYY-MM-DD-HHMMSS.zip.
// Safe to run while the app is running: the database is copied with SQLite's online backup.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { BACKUPS_DIR, UPLOADS_DIR } from '../server/config.js';
import { getDb } from '../server/db/connection.js';

const stamp = new Date().toISOString().replace('T', '-').replace(/[:]/g, '').slice(0, 17);
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : BACKUPS_DIR;
const outFile = path.join(outDir, `epl-${stamp}.zip`);

fs.mkdirSync(outDir, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epl-backup-'));
const dbCopy = path.join(tmpDir, 'epl.db');

try {
  await getDb().backup(dbCopy);

  const zip = new AdmZip();
  zip.addLocalFile(dbCopy);
  if (fs.existsSync(UPLOADS_DIR)) zip.addLocalFolder(UPLOADS_DIR, 'uploads');
  zip.writeZip(outFile);

  const mb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
  console.log(`Backup written: ${outFile} (${mb} MB)`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
