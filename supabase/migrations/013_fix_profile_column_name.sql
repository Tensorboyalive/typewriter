-- Hotfix: production profiles table uses display_name, not name
-- Migration 012 set a trigger referencing the wrong column

-- Fix the auto_create_profile trigger to use display_name
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, email)
  VALUES (NEW.id, '', 'admin', NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(public.profiles.email, EXCLUDED.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Also backfill any remaining NULL emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
