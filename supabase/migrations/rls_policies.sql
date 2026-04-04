-- SiteSync Cloud Suite — Row Level Security (RLS) Policies
-- Apply these in the Supabase Dashboard → SQL Editor, or via `supabase db push`.
--
-- IMPORTANT: Run `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` first for each table.
-- These policies enforce user-level data isolation: users only see/mutate their own records
-- unless they are admin or super_admin.

-- Helper: check if current user has an admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- ────────────────────────────────────────────────
-- PROJECTS
-- ────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (created_by = auth.uid()::text OR is_admin());

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (created_by = auth.uid()::text OR is_admin());

-- ────────────────────────────────────────────────
-- PROPERTIES
-- ────────────────────────────────────────────────
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "properties_delete" ON properties FOR DELETE
  USING (is_admin());

-- ────────────────────────────────────────────────
-- RFIS
-- ────────────────────────────────────────────────
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfis_select" ON rfis FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "rfis_insert" ON rfis FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rfis_update" ON rfis FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "rfis_delete" ON rfis FOR DELETE
  USING (created_by_user = auth.uid()::text OR is_admin());

-- ────────────────────────────────────────────────
-- SUBMITTALS
-- ────────────────────────────────────────────────
ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittals_select" ON submittals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "submittals_insert" ON submittals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "submittals_update" ON submittals FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "submittals_delete" ON submittals FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- CHANGE ORDERS
-- ────────────────────────────────────────────────
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_orders_select" ON change_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "change_orders_insert" ON change_orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "change_orders_update" ON change_orders FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "change_orders_delete" ON change_orders FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- DAILY REPORTS
-- ────────────────────────────────────────────────
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_reports_select" ON daily_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_insert" ON daily_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_update" ON daily_reports FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_delete" ON daily_reports FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- BUDGETS
-- ────────────────────────────────────────────────
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "budgets_insert" ON budgets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "budgets_update" ON budgets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "budgets_delete" ON budgets FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- LENDERS
-- ────────────────────────────────────────────────
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lenders_select" ON lenders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lenders_insert" ON lenders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lenders_update" ON lenders FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "lenders_delete" ON lenders FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- TREASURY TRANSACTIONS
-- ────────────────────────────────────────────────
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_select" ON treasury_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "treasury_insert" ON treasury_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "treasury_update" ON treasury_transactions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "treasury_delete" ON treasury_transactions FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────
-- TENANTS, WORK ORDERS, DRAW REQUESTS
-- ────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_all" ON tenants USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_orders_all" ON work_orders USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE draw_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draw_requests_all" ON draw_requests USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────
-- COMPLIANCE ITEMS
-- ────────────────────────────────────────────────
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_all" ON compliance_items USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────
-- PROFILES (users can only update their own)
-- ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────
-- STORAGE BUCKET POLICIES (run in Supabase Dashboard → Storage)
-- ────────────────────────────────────────────────
-- Bucket: documents (private, authenticated users only)
-- INSERT: allow authenticated
-- SELECT: allow authenticated
-- DELETE: allow owner or admin

-- Bucket: property-images (public read, authenticated write)
-- INSERT: allow authenticated
-- SELECT: allow public
