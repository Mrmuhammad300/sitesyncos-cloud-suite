-- Grant admin role to existing users so they can create projects
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Also allow field_staff to insert projects (broader access for testing)
CREATE POLICY "Authenticated users can create projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "PM and admins can create projects" ON public.projects;
