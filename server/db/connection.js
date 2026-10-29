import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { DATA_DIR, DB_PATH, ORIGINALS_DIR, THUMBS_DIR } from '../config.js';
import { seedProjects } from './seed.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

let db;

export function getDb() {
  if (db) return db;

  for (const dir of [DATA_DIR, ORIGINALS_DIR, THUMBS_DIR]) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const isNew = db.pragma('user_version', { simple: true }) === 0;
  migrate(db);
  if (isNew) seedProjects(db);

  return db;
}

// Applies migrations/NNN_name.sql files in order; PRAGMA user_version tracks the last one applied.
function migrate(db) {
  const current = db.pragma('user_version', { simple: true });
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    })();
    console.log(`[db] applied migration ${file}`);
  }
}
