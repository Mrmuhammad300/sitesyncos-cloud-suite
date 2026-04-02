
CREATE TABLE public.compliance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  category TEXT NOT NULL,
  requirement TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  due_date DATE,
  assignee TEXT,
  last_checked DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compliance items viewable by authenticated"
ON public.compliance_items FOR SELECT TO authenticated
USING (true);

CREATE POLICY "PM and admins can create compliance items"
ON public.compliance_items FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "PM and admins can update compliance items"
ON public.compliance_items FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE TRIGGER update_compliance_items_updated_at
BEFORE UPDATE ON public.compliance_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
