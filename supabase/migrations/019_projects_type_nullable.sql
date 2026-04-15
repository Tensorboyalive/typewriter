-- Migration 019: Make projects.type nullable.
--
-- Context: We migrated to the `format` column (reel / carousel / text) in
-- migration 016. The legacy `type` column has a NOT NULL constraint that
-- blocks inserts from the new code path, producing:
--   "null value in column 'type' of relation 'projects' violates not-null constraint"
--
-- Fix: drop the NOT NULL. The column is preserved for historical data; new
-- rows can insert without it.

alter table public.projects
  alter column type drop not null;
