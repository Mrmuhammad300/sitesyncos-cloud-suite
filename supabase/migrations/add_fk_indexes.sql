-- FK indexes for frequently-queried foreign key columns
-- These prevent full-table scans on every project-scoped SELECT

-- Build module
CREATE INDEX IF NOT EXISTS idx_rfis_project_id               ON rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_project_id          ON submittals(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id       ON change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id       ON daily_reports(project_id);

-- Ops module
CREATE INDEX IF NOT EXISTS idx_work_orders_project_id         ON work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_project_id             ON budgets(project_id);

-- Spatial module
CREATE INDEX IF NOT EXISTS idx_blender_jobs_project_id        ON blender_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_floor_plan_variants_project_id ON floor_plan_variants(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_models_job_id        ON generated_models(blender_job_id);

-- Webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id  ON webhook_deliveries(webhook_id);

-- Audit logs (already partially indexed; add composite for table+action filter)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action        ON audit_logs(table_name, action);
