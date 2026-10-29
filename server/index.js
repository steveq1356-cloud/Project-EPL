import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { CLIENT_DIST, DB_PATH, HOST, PORT, UPLOADS_DIR } from './config.js';
import { getDb } from './db/connection.js';
import projectsRouter from './routes/projects.js';

getDb(); // open the database and apply migrations before taking requests

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/projects', projectsRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));

// In `npm start` mode, serve the built React app from the same port.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`EPL server running at http://${HOST}:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
