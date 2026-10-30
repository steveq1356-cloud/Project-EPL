-- EPL schema v3: archived projects, per-project page layout, custom sections, app settings.

ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1));
-- JSON array of section keys in page order, e.g. ["notebook","tasks","custom:4"].
-- NULL means the default layout. A built-in section left out is hidden (its data is kept).
ALTER TABLE projects ADD COLUMN layout TEXT;

-- Sections you add yourself: Markdown notes, checklists, data tables (with a chart), embeds.
CREATE TABLE sections (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('notes', 'checklist', 'table', 'embed')),
  title       TEXT NOT NULL,
  data        TEXT NOT NULL DEFAULT '{}',  -- JSON, shape depends on kind
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sections_project ON sections(project_id);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL  -- JSON
);
