-- EPL schema v2: key figures, budgets, purchase categories, task completion
-- times, and featured links (shown in the project's CAD / document viewer).

ALTER TABLE projects ADD COLUMN budget_cents INTEGER;
-- JSON array of { label, value, unit, note } — the project's key figures.
ALTER TABLE projects ADD COLUMN specs TEXT NOT NULL DEFAULT '[]';

ALTER TABLE purchases ADD COLUMN category TEXT NOT NULL DEFAULT '';

ALTER TABLE tasks ADD COLUMN completed_at TEXT;
ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';

ALTER TABLE links ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE links ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1));

CREATE INDEX idx_purchases_date ON purchases(date_ordered);
CREATE INDEX idx_tasks_due ON tasks(done, due_date);
