-- Editor daily output log
CREATE TABLE IF NOT EXISTS editor_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  live_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editor_outputs_user_date ON editor_outputs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_editor_outputs_channel_date ON editor_outputs(channel_id, date);

-- RLS: team members of the channel can view, user can insert/update own
ALTER TABLE editor_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outputs_select_team" ON editor_outputs;
CREATE POLICY "outputs_select_team" ON editor_outputs
  FOR SELECT USING (
    channel_id IN (SELECT channel_id FROM team_members WHERE user_id = auth.uid())
    OR channel_id IN (SELECT id FROM channels WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "outputs_insert_own" ON editor_outputs;
CREATE POLICY "outputs_insert_own" ON editor_outputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outputs_update_own" ON editor_outputs;
CREATE POLICY "outputs_update_own" ON editor_outputs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outputs_delete_own" ON editor_outputs;
CREATE POLICY "outputs_delete_own" ON editor_outputs
  FOR DELETE USING (auth.uid() = user_id);
