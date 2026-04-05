-- Add JSONB preferences column to profiles for server-side preference persistence
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.preferences IS
  'User notification and app preferences, e.g. {"rfi_updates":true,"budget_alerts":false}';
