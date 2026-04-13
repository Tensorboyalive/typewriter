-- Control Tower v2 — New tables + project upgrades
-- Made fully idempotent so it can be re-run safely

-- Profiles (for future role system)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_profiles" ON profiles;
CREATE POLICY "users_own_profiles" ON profiles FOR ALL USING (auth.uid() = id);

-- Add new columns to projects for team pipeline
ALTER TABLE projects ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'tb';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_link TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS posted_link TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_brand_deal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id UUID;

-- Migrate old statuses to new ones
UPDATE projects SET status = 'idea' WHERE status = 'ideation';
UPDATE projects SET status = 'scripted' WHERE status = 'scripting';
UPDATE projects SET status = 'assigned' WHERE status = 'shoot';
UPDATE projects SET status = 'in_edit' WHERE status = 'editing';
-- 'posted' stays as 'posted'

-- Content Bank (pre-written text content)
CREATE TABLE IF NOT EXISTS content_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'linkedin',
  content_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_date DATE,
  posted_link TEXT,
  posted_at TIMESTAMPTZ,
  metrics_views INT,
  metrics_likes INT,
  metrics_saves INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_bank_user ON content_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_content_bank_status ON content_bank(user_id, status);
ALTER TABLE content_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_content_bank" ON content_bank;
CREATE POLICY "users_own_content_bank" ON content_bank FOR ALL USING (auth.uid() = user_id);

-- PA Daily Checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  skip_reason TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_user_date ON checklist_items(user_id, date);
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_checklist" ON checklist_items;
CREATE POLICY "users_own_checklist" ON checklist_items FOR ALL USING (auth.uid() = user_id);

-- Deals Pipeline (revenue tracking)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT,
  source TEXT NOT NULL DEFAULT 'inbound',
  stage TEXT NOT NULL DEFAULT 'lead',
  value_amount NUMERIC NOT NULL DEFAULT 0,
  value_currency TEXT NOT NULL DEFAULT 'INR',
  deliverables TEXT,
  deadline DATE,
  invoice_status TEXT NOT NULL DEFAULT 'not_sent',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_user ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(user_id, stage);
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_deals" ON deals;
CREATE POLICY "users_own_deals" ON deals FOR ALL USING (auth.uid() = user_id);

-- Add deal_id FK to projects now that deals table exists (skip if already exists)
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT fk_projects_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
