-- Add user_id + channel_id indexes to back the unified Dashboard's
-- cross-channel aggregate queries introduced in the two-user refactor.
-- Prior migrations only indexed channel_id; the Dashboard now scans
-- by channel membership per fetch, so these indexes prevent seq scans
-- as project/session volume grows.

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON timer_sessions(user_id);
