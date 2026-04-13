-- Security hardening: search_path on SECURITY DEFINER + RLS WITH CHECK

-- Fix SECURITY DEFINER functions — set explicit search_path to prevent schema hijacking
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, '', 'admin')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION auto_add_channel_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (user_id, channel_id, role)
  VALUES (NEW.user_id, NEW.id, 'admin')
  ON CONFLICT (user_id, channel_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Fix RLS: add WITH CHECK to all FOR ALL policies
-- This ensures INSERT/UPDATE operations enforce the same ownership constraint

-- channels
DROP POLICY IF EXISTS "users_own_channels" ON channels;
CREATE POLICY "users_own_channels" ON channels
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- projects: also allow team members to read, but only channel owners can insert
DROP POLICY IF EXISTS "users_own_projects" ON projects;
CREATE POLICY "users_own_projects" ON projects
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.channel_id = projects.channel_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- expenses
DROP POLICY IF EXISTS "users_own_expenses" ON expenses;
CREATE POLICY "users_own_expenses" ON expenses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- income
DROP POLICY IF EXISTS "users_own_income" ON income;
CREATE POLICY "users_own_income" ON income
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- timer_sessions
DROP POLICY IF EXISTS "users_own_timer_sessions" ON timer_sessions;
CREATE POLICY "users_own_timer_sessions" ON timer_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- notes
DROP POLICY IF EXISTS "users_own_notes" ON notes;
CREATE POLICY "users_own_notes" ON notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- content_bank
DROP POLICY IF EXISTS "users_own_content_bank" ON content_bank;
CREATE POLICY "users_own_content_bank" ON content_bank
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- checklist_items
DROP POLICY IF EXISTS "users_own_checklist_items" ON checklist_items;
CREATE POLICY "users_own_checklist_items" ON checklist_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "users_own_profiles" ON profiles;
CREATE POLICY "users_own_profiles" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- team_members (admin manages, members can read own)
DROP POLICY IF EXISTS "admin_manage_team" ON team_members;
CREATE POLICY "admin_manage_team" ON team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = team_members.channel_id AND c.user_id = auth.uid()
    )
    OR team_members.user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = team_members.channel_id AND c.user_id = auth.uid()
    )
  );
