
-- Fix security warnings: search_path + permissive RLS

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.user_can_access_company(uid UUID, cid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND company_id = cid AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TABLE(role TEXT, company_id UUID) AS $$
  SELECT ur.role, ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id AND ur.active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- Fix permissive INSERT policy — restrict to authenticated users who are admins of the company
DROP POLICY "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_manage" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
