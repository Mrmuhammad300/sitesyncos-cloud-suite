
-- Drop all overly permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated can create rfis" ON public.rfis;
DROP POLICY IF EXISTS "Authenticated can update rfis" ON public.rfis;
DROP POLICY IF EXISTS "Authenticated can create submittals" ON public.submittals;
DROP POLICY IF EXISTS "Authenticated can update submittals" ON public.submittals;
DROP POLICY IF EXISTS "Authenticated can create cos" ON public.change_orders;
DROP POLICY IF EXISTS "Authenticated can update cos" ON public.change_orders;
DROP POLICY IF EXISTS "Authenticated can create reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Authenticated can update reports" ON public.daily_reports;

-- Projects: PM, admin, super_admin can create/update
CREATE POLICY "PM and admins can create projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "PM and admins can update projects" ON public.projects FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- RFIs: PM, superintendent, architect, engineer, admin can create/update
CREATE POLICY "Construction roles can create rfis" ON public.rfis FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'superintendent') OR
  public.has_role(auth.uid(), 'architect') OR
  public.has_role(auth.uid(), 'engineer') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Construction roles can update rfis" ON public.rfis FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'superintendent') OR
  public.has_role(auth.uid(), 'architect') OR
  public.has_role(auth.uid(), 'engineer') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Submittals: same as RFIs
CREATE POLICY "Construction roles can create submittals" ON public.submittals FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'superintendent') OR
  public.has_role(auth.uid(), 'architect') OR
  public.has_role(auth.uid(), 'engineer') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Construction roles can update submittals" ON public.submittals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'superintendent') OR
  public.has_role(auth.uid(), 'architect') OR
  public.has_role(auth.uid(), 'engineer') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Change Orders: PM/admin create, admin/super_admin update (approve)
CREATE POLICY "PM and admins can create cos" ON public.change_orders FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can update cos" ON public.change_orders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Daily Reports: field staff, superintendent, PM can create; authors can update own
CREATE POLICY "Field roles can create reports" ON public.daily_reports FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'field_staff') OR
  public.has_role(auth.uid(), 'superintendent') OR
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Authors can update own reports" ON public.daily_reports FOR UPDATE TO authenticated
USING (
  author_user = auth.uid() OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);
