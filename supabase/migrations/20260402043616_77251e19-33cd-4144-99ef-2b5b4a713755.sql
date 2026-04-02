
-- Budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  allocated NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  fiscal_year TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Budgets viewable by authenticated" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "PM and admins can create budgets" ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PM and admins can update budgets" ON public.budgets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Draw Requests table
CREATE TABLE public.draw_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  draw_number TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  requested_by TEXT,
  approved_by TEXT,
  submitted_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.draw_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Draws viewable by authenticated" ON public.draw_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "PM and admins can create draws" ON public.draw_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lender'));
CREATE POLICY "Admins can update draws" ON public.draw_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lender'));
CREATE TRIGGER update_draws_updated_at BEFORE UPDATE ON public.draw_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_name TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  unit TEXT,
  lease_start DATE,
  lease_end DATE,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants viewable by authenticated" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "PM and admins can create tenants" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "PM and admins can update tenants" ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Work Orders table
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  category TEXT,
  assigned_to TEXT,
  property_name TEXT,
  unit TEXT,
  reported_by TEXT,
  due_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WOs viewable by authenticated" ON public.work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Field roles can create WOs" ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Field roles can update WOs" ON public.work_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  doc_number TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'General',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Draft',
  uploaded_by TEXT,
  file_url TEXT,
  file_size TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents viewable by authenticated" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'architect') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated can update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'architect') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
