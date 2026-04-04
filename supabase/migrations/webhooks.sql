-- SiteSync Cloud Suite — Outbound Webhook System
-- Allows administrators to register URLs that receive HTTP POST payloads
-- when key domain events occur (RFI created, CO approved, draw approved, etc.)

-- ────────────────────────────────────────────────
-- 1. Webhooks table
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  url                 TEXT        NOT NULL CHECK (url LIKE 'https://%'),
  secret              TEXT,                         -- HMAC-SHA256 signing secret
  events              TEXT[]      NOT NULL DEFAULT '{}',
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  last_triggered_at   TIMESTAMPTZ,
  last_status         INT,                          -- last HTTP response status
  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhooks_is_active_idx ON webhooks(is_active);

-- ────────────────────────────────────────────────
-- 2. Webhook delivery log
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID        NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  response_status INT,
  response_body   TEXT,
  attempt         INT         NOT NULL DEFAULT 1,
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_delivered_at_idx ON webhook_deliveries(delivered_at DESC);

-- ────────────────────────────────────────────────
-- 3. RLS
-- ────────────────────────────────────────────────
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Only admins can manage webhooks
CREATE POLICY "admins_manage_webhooks" ON webhooks
  FOR ALL USING (is_admin());

-- Admins can view delivery history
CREATE POLICY "admins_view_deliveries" ON webhook_deliveries
  FOR SELECT USING (is_admin());

-- System inserts delivery records
CREATE POLICY "system_insert_deliveries" ON webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────
-- 4. updated_at trigger
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webhooks_updated_at ON webhooks;
CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
