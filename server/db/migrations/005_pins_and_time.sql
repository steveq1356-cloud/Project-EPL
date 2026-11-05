-- EPL schema v5: pinned projects and time spent on log entries.
ALTER TABLE projects ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1));
ALTER TABLE log_entries ADD COLUMN minutes INTEGER CHECK (minutes IS NULL OR minutes >= 0);
