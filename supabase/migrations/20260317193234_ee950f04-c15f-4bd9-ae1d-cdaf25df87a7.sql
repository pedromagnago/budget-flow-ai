
-- Allow supervisors/admins to update user_roles
CREATE POLICY "user_roles_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.user_can_access_company(auth.uid(), company_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = user_roles.company_id
    AND ur.role IN ('super_admin', 'supervisor') AND ur.active = true
  )
)
WITH CHECK (
  public.user_can_access_company(auth.uid(), company_id)
);

-- Allow supervisors/admins to delete user_roles
CREATE POLICY "user_roles_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.user_can_access_company(auth.uid(), company_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = user_roles.company_id
    AND ur.role IN ('super_admin', 'supervisor') AND ur.active = true
  )
);
