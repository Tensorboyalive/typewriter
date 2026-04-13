-- Add email to profiles for invite lookup (replaces admin API approach)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Backfill email from auth.users where possible
-- Note: this runs as migration owner; in production you'd use a trigger
DO $$
BEGIN
  UPDATE profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Skip if auth.users not accessible in migration context
END $$;
