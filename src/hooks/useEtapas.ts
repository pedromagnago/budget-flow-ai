import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';
import type { EtapaCompleta } from '@/types';

/**
 * Hook que retorna a visão consolidada por etapa (grupo orçamentário).
 * Consome a view vw_etapa_completa que cruza:
 *   etapa → itens → serviços → financeiro → fornecedores
 */
export function useEtapasCompletas() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['etapas-completas', companyId],
    queryFn: async (): Promise<EtapaCompleta[]> => {
      const { data, error } = await supabase
        .from('vw_etapa_completa' as never)
        .select('*' as never)
        .eq('company_id', companyId!)
        .order('etapa_valor_orcado' as never, { ascending: false } as never) as unknown as { data: EtapaCompleta[] | null; error: Error | null };

      if (error) throw error;

      return (data ?? []).map(e => ({
        ...e,
        etapa_valor_orcado: Number(e.etapa_valor_orcado),
        soma_orcado_itens: Number(e.soma_orcado_itens),
        soma_consumido_itens: Number(e.soma_consumido_itens),
        soma_saldo_itens: Number(e.soma_saldo_itens),
        valor_total_lancamentos: Number(e.valor_total_lancamentos),
        valor_pago_lancamentos: Number(e.valor_pago_lancamentos),
        pct_consumido: Number(e.pct_consumido),
        pct_fisico_concluido: Number(e.pct_fisico_concluido),
      }));
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.dashboard,
  });
}
