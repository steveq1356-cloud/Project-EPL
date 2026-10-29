export const SEED_PROJECTS = [
  'InsertPress',
  'Insert Gantry',
  'Parallettes',
  'Speaker',
  'Ironman Mask Jarvis',
  'Simple Robot',
];

// Adds any seed project that doesn't exist yet (matched by name), so it is safe to run twice.
export function seedProjects(db) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE name = ?');
  const insert = db.prepare('INSERT INTO projects (name) VALUES (?)');
  let added = 0;
  db.transaction(() => {
    for (const name of SEED_PROJECTS) {
      if (!exists.get(name)) {
        insert.run(name);
        added++;
      }
    }
  })();
  return added;
}
