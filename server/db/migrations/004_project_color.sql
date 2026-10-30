-- EPL schema v4: an accent color per project (a palette name like 'teal').
-- NULL means "pick one automatically from the project's id".
ALTER TABLE projects ADD COLUMN color TEXT;
