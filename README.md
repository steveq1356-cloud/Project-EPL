# EPL — Engineering Project Log

A private, local dashboard for personal engineering projects: overview, log, purchases,
tasks, photos and links in one place. It runs only on your laptop (`127.0.0.1`), has no
login, and keeps everything in a single SQLite file plus an uploads folder.

> **Status:** Phase 2. Projects (edited in place), log entries with Markdown and photos,
> a Photos tab with captions and a cover photo. Purchases, Tasks and Links arrive in
> Phase 3.

## Photos

- Add photos by **dragging them in**, **pasting** (Ctrl+V — e.g. a screenshot), or
  **choose files**. Works in the log entry form and on the Photos tab.
- Supported: JPEG, PNG, WebP, GIF, AVIF, TIFF, up to 40 MB each. iPhone HEIC photos
  aren't supported yet — export them as JPEG first (iPhone: Settings → Camera →
  Formats → Most Compatible).
- Thumbnails are generated automatically and rotated upright.
- Deleting a log entry keeps its photos in the Photos tab. Deletes can be undone for
  a few seconds from the message at the bottom of the screen.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer (developed on 24)
- No Python or C++ compiler needed — the SQLite driver and image library ship prebuilt.

## Setup

```bash
npm install
```

The first time the app starts it creates `data/epl.db` and adds the starter projects
(InsertPress, Insert Gantry, Parallettes, Speaker, Ironman Mask Jarvis, Simple Robot).

## Running

| Command         | What it does                                                              |
| --------------- | ------------------------------------------------------------------------- |
| `npm run dev`   | Development mode with hot reload. Open http://127.0.0.1:5173              |
| `npm start`     | Builds the UI, then serves everything from one port: http://127.0.0.1:3001 |
| `npm run seed`  | Re-adds any missing starter projects (never duplicates)                   |

Stop either mode with `Ctrl+C`.

Both servers listen on `127.0.0.1` only, so nothing is reachable from other devices
on your network.

## Where your data lives

```
data/
├── epl.db              # all projects, log entries, purchases, tasks, links
└── uploads/
    ├── originals/      # photos and attachments as uploaded
    └── thumbs/         # generated thumbnails
```

`data/` is in `.gitignore` — your data never goes to GitHub. Back it up separately (below).

To keep the data somewhere else, set `EPL_DATA_DIR` before starting:

```powershell
$env:EPL_DATA_DIR = "C:\EPL-data"; npm start
```

> **OneDrive note:** this folder is inside OneDrive. OneDrive can try to sync `epl.db`
> while the app is writing to it, which can cause lock errors or, rarely, a corrupted
> copy. If you see "database is locked" errors, move the data out of OneDrive with
> `EPL_DATA_DIR` and rely on `npm run backup` (whose zip files *are* safe to sync).

## Backup

```bash
npm run backup
```

Writes `backups/epl-YYYY-MM-DD-HHMMSS.zip` containing the database and all uploads.
It's safe to run while the app is open (it uses SQLite's online backup). To write the
zip somewhere else, such as a USB drive or a synced folder:

```bash
npm run backup -- "D:\EPL backups"
```

## Restore

1. Stop the app (`Ctrl+C`).
2. Run:

   ```bash
   npm run restore -- backups/epl-2026-10-29-195807.zip
   ```

Your current `data/` folder is moved to `data-before-restore-<time>/`, not deleted,
so a restore can always be undone by renaming folders back. Restore refuses to run
while the app is still running.

## Project layout

```
server/              Express API (localhost only)
  db/migrations/     numbered .sql files, applied automatically on startup
  repos/             the only code that runs SQL
  routes/            REST endpoints that call repos/
client/              React + Vite UI
  src/api/           the single data layer the UI uses (swap rest.js for a hosted backend later)
scripts/             backup, restore, seed
```

## Pushing to a private GitHub repo

Create an empty **private** repository on GitHub (no README), then:

```bash
git remote add origin https://github.com/<you>/epl.git
git push -u origin main
```
