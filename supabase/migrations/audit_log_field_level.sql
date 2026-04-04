-- SiteSync Cloud Suite — Field-Level Audit Logging Enhancement
--
-- Adds `changed_fields` column to audit_logs so UPDATE events record
-- exactly which columns changed, not just the full old/new row blobs.
--
-- Run after audit_log.sql is already applied.

-- ────────────────────────────────────────────────
-- 1. Add changed_fields column
-- ────────────────────────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

CREATE INDEX IF NOT EXISTS audit_logs_changed_fields_idx
  ON audit_logs USING GIN (changed_fields);

-- ────────────────────────────────────────────────
-- 2. Replace trigger function with field-level version
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record_id    TEXT;
  v_old          JSONB;
  v_new          JSONB;
  v_changed      TEXT[] := '{}';
  v_key          TEXT;
  v_old_val      JSONB;
  v_new_val      JSONB;
BEGIN
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

    -- Detect which fields actually changed (excluding housekeeping columns)
    FOR v_key IN
      SELECT jsonb_object_keys(v_new)
      EXCEPT
      SELECT unnest(ARRAY['updated_at', 'created_at'])
    LOOP
      v_old_val := v_old -> v_key;
      v_new_val := v_new -> v_key;
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;

    -- If only updated_at changed (e.g. no-op touch), skip logging
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO audit_logs (
    user_id, action, table_name, record_id,
    old_values, new_values, changed_fields
  )
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new,
    CASE WHEN TG_OP = 'UPDATE' THEN v_changed ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ────────────────────────────────────────────────
-- 3. Helper view: recent changes per field
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW audit_field_changes AS
SELECT
  al.id,
  al.user_id,
  al.action,
  al.table_name,
  al.record_id,
  fc.field_name,
  al.old_values -> fc.field_name AS old_value,
  al.new_values -> fc.field_name AS new_value,
  al.created_at
FROM audit_logs al
CROSS JOIN LATERAL unnest(al.changed_fields) AS fc(field_name)
WHERE al.action = 'UPDATE'
  AND al.changed_fields IS NOT NULL;

-- Only admins can view
CREATE POLICY "audit_field_changes_select" ON audit_logs
  FOR SELECT USING (is_admin());
