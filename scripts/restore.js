// Restores a backup zip into the data folder. Stop the app first.
// Usage: npm run restore -- backups/epl-2026-10-29-153000.zip
// The current data folder is moved aside (data-before-restore-<time>), never deleted.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { DATA_DIR, HOST, PORT } from '../server/config.js';

const zipPath = process.argv[2] && path.resolve(process.argv[2]);
if (!zipPath || !fs.existsSync(zipPath)) {
  console.error('Usage: npm run restore -- <path-to-backup.zip>');
  process.exit(1);
}

const zip = new AdmZip(zipPath);
if (!zip.getEntry('epl.db')) {
  console.error(`${zipPath} doesn't look like an EPL backup (no epl.db inside).`);
  process.exit(1);
}

const serverRunning = await new Promise((resolve) => {
  const socket = net.connect(PORT, HOST, () => { socket.end(); resolve(true); });
  socket.on('error', () => resolve(false));
});
if (serverRunning) {
  console.error('The EPL app is still running. Stop it (Ctrl+C in its terminal), then run restore again.');
  process.exit(1);
}

if (fs.existsSync(DATA_DIR)) {
  const stamp = new Date().toISOString().replace('T', '-').replace(/[:]/g, '').slice(0, 17);
  const aside = path.join(path.dirname(DATA_DIR), `data-before-restore-${stamp}`);
  fs.renameSync(DATA_DIR, aside);
  console.log(`Current data moved to ${aside}`);
}

zip.extractAllTo(DATA_DIR, true);
console.log(`Restored ${zipPath} into ${DATA_DIR}`);
