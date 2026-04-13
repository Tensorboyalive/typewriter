-- Role-based access: team members linked to channels
-- Roles: admin (full access), pa (view all channels, manage ops), editor (assigned channels only)

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'pa', 'editor')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Admin can see all team members in their channels
CREATE POLICY "admin_manage_team" ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM channels c WHERE c.id = team_members.channel_id AND c.user_id = auth.uid()
    )
    OR team_members.user_id = auth.uid()
  );

-- Ensure the channel owner (admin) auto-populates their own profile
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, '', 'admin')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_create_profile();

-- When a channel is created, auto-add the creator as admin team member
CREATE OR REPLACE FUNCTION auto_add_channel_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (user_id, channel_id, role)
  VALUES (NEW.user_id, NEW.id, 'admin')
  ON CONFLICT (user_id, channel_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_channel_created ON channels;
CREATE TRIGGER on_channel_created
  AFTER INSERT ON channels
  FOR EACH ROW EXECUTE FUNCTION auto_add_channel_admin();
