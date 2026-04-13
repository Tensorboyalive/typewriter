-- Fix invite system: email population + cross-user lookup
-- Problem 1: auto_create_profile() never set the email column
-- Problem 2: RLS blocks admin from looking up other users' profiles by email

-- ─── Fix 1: Update trigger to set email on signup ──────────
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

-- ─── Fix 2: Backfill all existing profiles with email ──────
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ─── Fix 3: SECURITY DEFINER function for email lookup ─────
-- This bypasses RLS so admin can find any user by email
CREATE OR REPLACE FUNCTION lookup_user_by_email(lookup_email TEXT)
RETURNS UUID AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id
  FROM public.profiles
  WHERE email = lower(trim(lookup_email))
  LIMIT 1;

  -- Fallback: check auth.users directly and backfill
  IF found_id IS NULL THEN
    SELECT id INTO found_id
    FROM auth.users
    WHERE email = lower(trim(lookup_email))
    LIMIT 1;

    IF found_id IS NOT NULL THEN
      UPDATE public.profiles
      SET email = lower(trim(lookup_email))
      WHERE id = found_id AND email IS NULL;
    END IF;
  END IF;

  RETURN found_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Grant execute to authenticated users (needed for RPC calls)
GRANT EXECUTE ON FUNCTION lookup_user_by_email(TEXT) TO authenticated;
