
-- AI Agent Registry
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text UNIQUE NOT NULL,
  name text NOT NULL,
  agent_type text NOT NULL,
  autonomy_level text NOT NULL DEFAULT 'AdvisoryOnly',
  is_active boolean NOT NULL DEFAULT true,
  routing_logic text,
  description text,
  configuration jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents viewable by authenticated" ON public.ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agents" ON public.ai_agents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update agents" ON public.ai_agents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent Executions (audit log)
CREATE TABLE public.agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text UNIQUE NOT NULL,
  agent_id text NOT NULL REFERENCES public.ai_agents(agent_id),
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  confidence_score numeric DEFAULT 0,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  reasoning text,
  pipeline_id text,
  pipeline_position integer DEFAULT 0,
  requires_approval boolean DEFAULT false,
  approved_by uuid,
  approval_status text,
  approval_feedback text,
  escalated_to text,
  duration_ms integer,
  risk_flags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executions viewable by authenticated" ON public.agent_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create executions" ON public.agent_executions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update executions" ON public.agent_executions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'project_manager'));

CREATE TRIGGER update_agent_executions_updated_at BEFORE UPDATE ON public.agent_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agent_executions_agent_id ON public.agent_executions(agent_id);
CREATE INDEX idx_agent_executions_pipeline_id ON public.agent_executions(pipeline_id);
CREATE INDEX idx_agent_executions_status ON public.agent_executions(status);
CREATE INDEX idx_agent_executions_event_type ON public.agent_executions(event_type);

-- Agent Decisions
CREATE TABLE public.agent_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text NOT NULL,
  agent_id text NOT NULL REFERENCES public.ai_agents(agent_id),
  decision_type text NOT NULL,
  decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric DEFAULT 0,
  risk_flags text[] DEFAULT '{}',
  policy_violations text[] DEFAULT '{}',
  requires_human boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Decisions viewable by authenticated" ON public.agent_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create decisions" ON public.agent_decisions FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_agent_decisions_execution_id ON public.agent_decisions(execution_id);
CREATE INDEX idx_agent_decisions_agent_id ON public.agent_decisions(agent_id);

-- Agent Memory (persistent knowledge store)
CREATE TABLE public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type text NOT NULL DEFAULT 'general',
  project_id uuid REFERENCES public.projects(id),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  importance numeric DEFAULT 0.5,
  access_count integer DEFAULT 0,
  last_accessed timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memory viewable by authenticated" ON public.agent_memory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage memory" ON public.agent_memory FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update memory" ON public.agent_memory FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agent_memory_project_id ON public.agent_memory(project_id);
CREATE INDEX idx_agent_memory_key ON public.agent_memory(key);

-- Agent Learning Signals (feedback loop)
CREATE TABLE public.agent_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text NOT NULL,
  agent_id text NOT NULL REFERENCES public.ai_agents(agent_id),
  signal_type text NOT NULL DEFAULT 'approval',
  feedback text,
  is_positive boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signals viewable by authenticated" ON public.agent_learning_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create signals" ON public.agent_learning_signals FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_agent_learning_signals_agent_id ON public.agent_learning_signals(agent_id);

-- Event-Agent Bindings (MOE routing table)
CREATE TABLE public.event_agent_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text UNIQUE NOT NULL,
  pipeline_agents text[] NOT NULL DEFAULT '{}',
  autonomy_level text NOT NULL DEFAULT 'DraftWithApproval',
  final_output_key text,
  requires_audit boolean DEFAULT true,
  block_on_risk_flag boolean DEFAULT true,
  min_confidence numeric DEFAULT 0.7,
  hard_blocks text[] DEFAULT '{}',
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_agent_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bindings viewable by authenticated" ON public.event_agent_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage bindings" ON public.event_agent_bindings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update bindings" ON public.event_agent_bindings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_event_agent_bindings_updated_at BEFORE UPDATE ON public.event_agent_bindings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Domain State Machines
CREATE TABLE public.domain_state_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  states text[] NOT NULL DEFAULT '{}',
  initial_state text NOT NULL,
  terminal_states text[] DEFAULT '{}',
  transitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  guards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_state_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "State machines viewable by authenticated" ON public.domain_state_machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage state machines" ON public.domain_state_machines FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update state machines" ON public.domain_state_machines FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_domain_state_machines_updated_at BEFORE UPDATE ON public.domain_state_machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
