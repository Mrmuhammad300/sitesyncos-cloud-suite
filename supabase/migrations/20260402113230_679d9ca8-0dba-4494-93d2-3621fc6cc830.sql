
-- Tighten agent_executions insert policy
DROP POLICY "System can create executions" ON public.agent_executions;
CREATE POLICY "Roles can create executions" ON public.agent_executions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'project_manager'));

-- Tighten agent_decisions insert policy
DROP POLICY "System can create decisions" ON public.agent_decisions;
CREATE POLICY "Roles can create decisions" ON public.agent_decisions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'project_manager'));

-- Tighten agent_learning_signals insert policy
DROP POLICY "Authenticated can create signals" ON public.agent_learning_signals;
CREATE POLICY "Roles can create signals" ON public.agent_learning_signals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'project_manager'));
