CREATE POLICY "PM and admins can delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);