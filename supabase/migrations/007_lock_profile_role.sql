-- Security fix: prevent users from self-promoting via profiles.role
-- The old policy allowed users to UPDATE any column on their own profile,
-- including role. This splits into SELECT + restricted UPDATE policies.

-- Ensure the role column exists (profiles may have been created before migration 003)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'editor';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "users_own_profiles" ON profiles;

-- Anyone can read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile, but role must remain unchanged
-- The WITH CHECK ensures the role column stays the same as the current value
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- Insert policy for the auto_create_profile trigger (SECURITY DEFINER bypasses RLS,
-- but if we ever need direct inserts, this is here)
CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also fix the auto_create_profile trigger to default to 'editor' not 'admin'
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, '', 'editor')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;
