// Adds the starter projects if they're missing. The app also does this automatically on first run.
import { getDb } from '../server/db/connection.js';
import { seedProjects } from '../server/db/seed.js';

const added = seedProjects(getDb());
console.log(added ? `Added ${added} project(s).` : 'All seed projects already exist.');
