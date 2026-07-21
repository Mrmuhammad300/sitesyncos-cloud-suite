-- Field Ops: contractors, work order checklists, and PM<->field messaging

-- Contractors table (replaces free-text "assigned_to" with a real roster)
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  trade TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors viewable by authenticated" ON public.contractors FOR SELECT TO authenticated USING (true);
CREATE POLICY "PM and admins can create contractors" ON public.contractors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PM and admins can update contractors" ON public.contractors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PM and admins can delete contractors" ON public.contractors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link work orders to a real contractor (assigned_to text is kept as a display fallback)
ALTER TABLE public.work_orders ADD COLUMN assigned_contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL;

-- Checklist items per work order / punch list item
CREATE TABLE public.work_order_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_order_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checklist items viewable by authenticated" ON public.work_order_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Field roles can create checklist items" ON public.work_order_checklist_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Field roles can update checklist items" ON public.work_order_checklist_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Field roles can delete checklist items" ON public.work_order_checklist_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_wo_checklist_items_updated_at BEFORE UPDATE ON public.work_order_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PM <-> field messaging thread, one per work order
CREATE TABLE public.work_order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_order_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WO messages viewable by authenticated" ON public.work_order_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Field roles can send WO messages" ON public.work_order_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'field_staff') OR public.has_role(auth.uid(), 'superintendent') OR public.has_role(auth.uid(), 'project_manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Realtime for live PM<->field updates (mirrors NotificationsPage's postgres_changes pattern)
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
