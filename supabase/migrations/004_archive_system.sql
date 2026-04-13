-- Archive system: soft delete via archived_at column
-- All "delete" operations become UPDATE ... SET archived_at = now()
-- Queries filter WHERE archived_at IS NULL by default

ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE income ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE content_bank ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE timer_sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create indexes for efficient filtering on archived_at
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_archived ON expenses (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_archived ON income (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_bank_archived ON content_bank (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_archived ON checklist_items (archived_at) WHERE archived_at IS NULL;
