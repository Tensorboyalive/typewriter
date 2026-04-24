-- 020_user_settings_ui_prefs.sql
-- Purpose: persist per-user UI preferences (pipeline view mode, density,
--          hide-ready toggle, collapsed group state) across devices.
-- Safety:  ADD COLUMN with NOT NULL DEFAULT is an online, metadata-only
--          operation in Postgres 11+. No existing rows are rewritten.
--          The existing RLS policy `users_own_settings` already covers
--          this column. Zero impact on projects/channels/notes or any
--          other table or query.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.ui_prefs IS
  'Free-form UI preferences as JSON. Shape validated client-side. Example: { "pipeline": { "viewMode": "list", "rowDensity": "compact", "showReady": false, "collapsed": { "ideation:2026-04-30": true } } }';
