# EPL — Engineering Project Log

A private, local dashboard for personal engineering projects. Every project gets one
open page — title block, key figures, notebook, tasks, spend, links, a CAD / drawing
viewer, photos, purchases and activity — so you can see everything without clicking
through tabs. It runs only on your laptop (`127.0.0.1`), has no login, and keeps
everything in one SQLite file plus an uploads folder.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer (developed on 24)
- No Python or C++ compiler needed — the SQLite driver, image library and STEP
  importer all ship prebuilt.

## Setup

```bash
npm install
```

The first start creates `data/epl.db` and adds the starter projects.

## Running

| Command         | What it does                                                               |
| --------------- | -------------------------------------------------------------------------- |
| `npm start`     | Builds the UI, then serves everything at **http://127.0.0.1:3001**         |
| `npm run dev`   | Development mode with hot reload at **http://127.0.0.1:5173**              |
| `npm run seed`  | Re-adds any missing starter projects (never duplicates)                    |

Stop either with `Ctrl+C`. Both listen on `127.0.0.1` only, so nothing is reachable
from other devices on your network.

## What's where

**Dashboard** — KPI row (active projects, spend this month and all-time, open tasks,
log entries), spend-by-month chart, a 26-week activity heatmap, project cards (cover,
status, next action, spend, task progress, last update, a *stale* flag on Active
projects quiet for 21+ days), recent activity, tasks due in the next 14 days,
orders in transit, and spend by project.

**Project page** (one scrolling page, with a sticky section bar):

| Section | What it holds |
| --- | --- |
| Title block | Cover photo, name, status, tags, summary, **next action**, goal, start/target dates with a timeline, budget, spend |
| Key figures | Your own headline numbers (design load, peak stress, cost per unit…) plus live spend-vs-budget and task progress |
| Notebook | Log entries (Note / Decision / Problem / Test / Idea / Milestone) in Markdown with photos, filterable by type |
| Side panels | Tasks (priority, due dates), spend summary, links & files |
| CAD & drawings | 3D viewer and document viewer — see below |
| Photos | Gallery with captions, dates, cover selection, link to a log entry |
| Purchases | Full table with inline status, receipts, cumulative spend vs budget, spend by category and vendor |
| Activity | Heatmap and recent changes for this project |

Everything is edited in place — click a field, type, press Enter. Deletes show an
**Undo** for a few seconds.

## CAD & drawings viewer

Drop a file onto the viewer (or star ☆ any file in *Links & files*):

- **3D models:** STL, STEP/STP, IGES, OBJ, GLB/GLTF, 3MF, PLY — orbit/pan/zoom, Iso/Top/Front/Right,
  edges, wireframe, a **section cut** slider, Z-up/Y-up toggle, dimensions readout, PNG snapshot.
  STEP and IGES are read in the browser with OpenCascade (WebAssembly); the first one takes a
  few seconds to load.
- **Drawings:** PDFs render in place. A *3D PDF*'s model (U3D/PRC) only shows in Adobe
  Acrobat/Reader — download it to open there, or export STEP/STL to view it here.
- **Embeds:** any web page or tool — Onshape/Fusion 360 share links, a GitHub Pages app,
  a product site. If a site refuses embedding, use *Open in new tab*.

Units are assumed to be millimetres.

## Keyboard shortcuts

| Key | Does |
| --- | --- |
| `/` | Search everything (log, tasks, purchases, links, photos) |
| `N` / `P` / `T` | Quick add a log entry / purchase / task to any project |
| `G` then `D` | Dashboard |
| `G` then `1`–`9` | Jump to a project in the sidebar |
| `Ctrl+Enter` | Save the form you're in |
| `?` | Show all shortcuts |

Photos can be **pasted** (Ctrl+V a screenshot) or **dragged in** anywhere a drop zone shows.
Supported: JPEG, PNG, WebP, GIF, AVIF, TIFF up to 40 MB. iPhone HEIC isn't supported —
set the camera to *Most Compatible* or export as JPEG.

## Where your data lives

```
data/
├── epl.db              # projects, log, purchases, tasks, links, key figures
└── uploads/
    ├── originals/      # photos, receipts, CAD files, PDFs as uploaded
    └── thumbs/         # generated photo thumbnails
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

Writes `backups/epl-YYYY-MM-DD-HHMMSS.zip` with the database and all uploads. Safe to
run while the app is open (it uses SQLite's online backup). To write it elsewhere:

```bash
npm run backup -- "D:\EPL backups"
```

## Restore

1. Stop the app (`Ctrl+C`).
2. Run `npm run restore -- backups/epl-2026-10-29-195807.zip`

Your current `data/` is moved to `data-before-restore-<time>/`, never deleted. Restore
refuses to run while the app is still running.

## Project layout

```
server/              Express API (localhost only)
  db/migrations/     numbered .sql files, applied automatically on startup
  repos/             the only code that runs SQL (insights.js: dashboard, search, activity)
  routes/            REST endpoints that call repos/
client/              React + Vite UI
  src/api/           the single data layer the UI uses (swap rest.js for a hosted backend later)
  src/components/    shared pieces — charts/, viewer/ (3D), forms, search, quick add
  src/pages/         Dashboard and the project page (project/ holds its sections)
scripts/             backup, restore, seed
```

Chart colors are defined as `--viz-*` tokens in `client/src/styles/theme.css`; the
series color and the heatmap ramp were checked for contrast and colorblind-safety
against both the light and dark card surfaces.
