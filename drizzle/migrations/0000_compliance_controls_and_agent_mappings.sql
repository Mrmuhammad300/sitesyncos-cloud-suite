-- Compliance control library
CREATE TABLE public.compliance_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL,
  control_ref text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  applies_to text[] NOT NULL DEFAULT ARRAY['*'],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework, control_ref)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_controls TO authenticated;
GRANT ALL ON public.compliance_controls TO service_role;

ALTER TABLE public.compliance_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read controls" ON public.compliance_controls
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage controls insert" ON public.compliance_controls
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage controls update" ON public.compliance_controls
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage controls delete" ON public.compliance_controls
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Mapping between automations (agents) and compliance controls
CREATE TABLE public.agent_control_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL REFERENCES public.ai_agents(agent_id) ON DELETE CASCADE,
  control_id uuid NOT NULL REFERENCES public.compliance_controls(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unverified',
  is_required boolean NOT NULL DEFAULT true,
  evidence text,
  owner text,
  last_reviewed date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, control_id),
  CONSTRAINT agent_control_status_check CHECK (status IN ('satisfied','gap','unverified','not_applicable'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_control_mappings TO authenticated;
GRANT ALL ON public.agent_control_mappings TO service_role;

ALTER TABLE public.agent_control_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read mappings" ON public.agent_control_mappings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create mappings" ON public.agent_control_mappings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update mappings" ON public.agent_control_mappings
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete mappings" ON public.agent_control_mappings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_agent_control_mappings_updated_at
  BEFORE UPDATE ON public.agent_control_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agent_control_mappings_agent ON public.agent_control_mappings(agent_id);
CREATE INDEX idx_compliance_controls_framework ON public.compliance_controls(framework);