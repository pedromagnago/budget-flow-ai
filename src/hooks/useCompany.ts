import { useAuth } from '@/hooks/useAuth';

export function useCompany() {
  const { companyId } = useAuth();
  return { companyId };
}
