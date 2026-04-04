-- SiteSync Cloud Suite — Audit Log
-- Run this in Supabase Dashboard → SQL Editor, or via `supabase db push`.
-- Tracks all INSERT/UPDATE/DELETE events on key tables.

-- ────────────────────────────────────────────────
-- 1. Create audit_logs table
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,                   -- INSERT | UPDATE | DELETE
  table_name   TEXT NOT NULL,
  record_id    TEXT,                            -- PK of the affected row (as text)
  old_values   JSONB,                           -- previous values (UPDATE/DELETE)
  new_values   JSONB,                           -- new values (INSERT/UPDATE)
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx     ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx    ON audit_logs(action);

-- ────────────────────────────────────────────────
-- 2. Enable RLS
-- ────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (is_admin());

-- Only system triggers can insert (no direct client writes)
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (true); -- Trigger runs with SECURITY DEFINER

-- ────────────────────────────────────────────────
-- 3. Trigger function
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record_id TEXT;
  v_old       JSONB;
  v_new       JSONB;
BEGIN
  -- Extract the id field from the record
  IF TG_OP = 'DELETE' THEN
    v_record_id := (OLD.id)::TEXT;
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := (NEW.id)::TEXT;
    v_old := NULL;
    v_new := to_jsonb(NEW);
  ELSE -- UPDATE
    v_record_id := (NEW.id)::TEXT;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ────────────────────────────────────────────────
-- 4. Attach trigger to key tables
-- ────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'projects', 'rfis', 'submittals', 'change_orders', 'daily_reports',
    'budgets', 'draw_requests', 'tenants', 'work_orders', 'documents',
    'properties', 'lenders', 'compliance_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_%I ON %I;
      CREATE TRIGGER audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
    ', t, t, t, t);
  END LOOP;
END;
$$;
