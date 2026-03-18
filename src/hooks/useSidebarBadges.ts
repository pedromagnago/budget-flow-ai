import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export function useSidebarBadges() {
  const { companyId } = useCompany();

  const { data: pendingAudit } = useQuery({
    queryKey: ['sidebar-badge-audit', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('classificacoes_ia')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('status_auditoria', 'pendente');
      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: unreadAlerts } = useQuery({
    queryKey: ['sidebar-badge-alerts', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('alertas')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('lido', false);
      if (error) return 0;
      return count ?? 0;
    },
  });

  return {
    pendingAudit: pendingAudit ?? 0,
    unreadAlerts: unreadAlerts ?? 0,
  };
}
