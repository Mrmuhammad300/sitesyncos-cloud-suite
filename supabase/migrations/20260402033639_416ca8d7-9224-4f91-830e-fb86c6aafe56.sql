
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'project_manager', 'superintendent', 'architect', 'engineer', 'owner', 'subcontractor', 'lender', 'field_staff');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'field_staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table (for RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Planning',
  phase TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  budget NUMERIC(15,2) NOT NULL DEFAULT 0,
  spent NUMERIC(15,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  project_manager TEXT,
  team_size INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects viewable by authenticated" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);

-- RFIs table
CREATE TABLE public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Draft',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_to TEXT,
  created_by_user UUID,
  due_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RFIs viewable by authenticated" ON public.rfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rfis" ON public.rfis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rfis" ON public.rfis FOR UPDATE TO authenticated USING (true);

-- Submittals table
CREATE TABLE public.submittals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending',
  spec_section TEXT,
  submitted_by TEXT,
  reviewer TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  submitted_date DATE,
  due_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submittals viewable by authenticated" ON public.submittals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create submittals" ON public.submittals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update submittals" ON public.submittals FOR UPDATE TO authenticated USING (true);

-- Change Orders table
CREATE TABLE public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  co_number TEXT NOT NULL,
  title TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending',
  category TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  days_impact INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT,
  approved_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "COs viewable by authenticated" ON public.change_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create cos" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cos" ON public.change_orders FOR UPDATE TO authenticated USING (true);

-- Daily Reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_number TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_user UUID,
  author_name TEXT,
  weather TEXT,
  temp_high INTEGER,
  temp_low INTEGER,
  crew_count INTEGER NOT NULL DEFAULT 0,
  work_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  safety_incidents INTEGER NOT NULL DEFAULT 0,
  delay_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  summary TEXT,
  activities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports viewable by authenticated" ON public.daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create reports" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update reports" ON public.daily_reports FOR UPDATE TO authenticated USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfis_updated_at BEFORE UPDATE ON public.rfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_submittals_updated_at BEFORE UPDATE ON public.submittals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
