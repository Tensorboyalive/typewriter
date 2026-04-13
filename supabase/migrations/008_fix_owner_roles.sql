-- Fix: channel owners should have admin role.
-- Migration 007 added the role column with DEFAULT 'editor', which set all
-- existing profiles to 'editor'. Channel owners need to be 'admin'.

UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT DISTINCT user_id FROM channels
);
