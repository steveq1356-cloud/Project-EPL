-- EPL schema v1
-- Dates are 'YYYY-MM-DD'; timestamps are ISO-8601 UTC. Money is integer cents.

CREATE TABLE projects (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  summary        TEXT NOT NULL DEFAULT '',
  goal           TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Idea'
                 CHECK (status IN ('Idea', 'Active', 'On Hold', 'Done', 'Abandoned')),
  start_date     TEXT,
  target_date    TEXT,
  next_action    TEXT NOT NULL DEFAULT '',
  tags           TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  cover_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE log_entries (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',  -- Markdown
  type        TEXT NOT NULL DEFAULT 'Note'
              CHECK (type IN ('Note', 'Decision', 'Problem', 'Test', 'Idea', 'Milestone')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_log_entries_project ON log_entries(project_id, timestamp DESC);

-- Non-image files: receipts, PDFs, CAD files, datasheets.
CREATE TABLE attachments (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stored_name    TEXT NOT NULL UNIQUE,  -- file name inside data/uploads/originals
  original_name  TEXT NOT NULL,
  mime           TEXT NOT NULL,
  size_bytes     INTEGER NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE photos (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_entry_id   INTEGER REFERENCES log_entries(id) ON DELETE SET NULL,
  stored_name    TEXT NOT NULL UNIQUE,  -- original in uploads/originals, thumbnail in uploads/thumbs
  original_name  TEXT NOT NULL,
  mime           TEXT NOT NULL,
  width          INTEGER,
  height         INTEGER,
  caption        TEXT NOT NULL DEFAULT '',
  taken_on       TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_photos_project ON photos(project_id);
CREATE INDEX idx_photos_log_entry ON photos(log_entry_id);

CREATE TABLE purchases (
  id                  INTEGER PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item                TEXT NOT NULL,
  vendor              TEXT NOT NULL DEFAULT '',
  link                TEXT NOT NULL DEFAULT '',
  qty                 REAL NOT NULL DEFAULT 1,
  unit_cost_cents     INTEGER NOT NULL DEFAULT 0,
  shipping_tax_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents         INTEGER GENERATED ALWAYS AS
                        (CAST(ROUND(qty * unit_cost_cents) AS INTEGER) + shipping_tax_cents) STORED,
  date_ordered        TEXT,
  status              TEXT NOT NULL DEFAULT 'Planned'
                      CHECK (status IN ('Planned', 'Ordered', 'Arrived', 'Returned')),
  notes               TEXT NOT NULL DEFAULT '',
  receipt_id          INTEGER REFERENCES attachments(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_purchases_project ON purchases(project_id);

CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  due_date    TEXT,
  priority    TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_tasks_project ON tasks(project_id);

CREATE TABLE links (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  url            TEXT NOT NULL DEFAULT '',            -- either a URL...
  attachment_id  INTEGER REFERENCES attachments(id) ON DELETE SET NULL,  -- ...or an uploaded file
  category       TEXT NOT NULL DEFAULT 'Reference'
                 CHECK (category IN ('CAD', 'Code', 'Datasheet', 'Reference')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_links_project ON links(project_id);
