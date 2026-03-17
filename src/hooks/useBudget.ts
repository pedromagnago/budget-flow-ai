import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';

interface OrcadoVsRealizado {
  grupo_id: string;
  grupo: string;
  valor_orcado: number;
  valor_consumido: number;
  valor_saldo: number;
  pct_consumido: number;
  itens_com_consumo: number;
  total_itens: number;
}

export function useBudgetSummary() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['budget-summary', companyId],
    queryFn: async (): Promise<OrcadoVsRealizado[]> => {
      if (!companyId) {
        // Fallback: query orcamento_grupos directly
        const { data, error } = await supabase
          .from('orcamento_grupos' as never)
          .select('*' as never) as unknown as { data: Array<{ id: string; nome: string; valor_total: number }> | null; error: Error | null };
        
        if (error || !data) return [];
        
        return data.map(g => ({
          grupo_id: g.id,
          grupo: g.nome,
          valor_orcado: Number(g.valor_total),
          valor_consumido: 0,
          valor_saldo: Number(g.valor_total),
          pct_consumido: 0,
          itens_com_consumo: 0,
          total_itens: 0,
        }));
      }

      const { data, error } = await supabase.rpc('get_orcado_vs_realizado' as never, { _company_id: companyId } as never) as unknown as { data: OrcadoVsRealizado[] | null; error: Error | null };
      
      if (error || !data) return [];
      return data.map(r => ({
        ...r,
        valor_orcado: Number(r.valor_orcado),
        valor_consumido: Number(r.valor_consumido),
        valor_saldo: Number(r.valor_saldo),
        pct_consumido: Number(r.pct_consumido),
      }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useOrcamentoGrupos() {
  return useQuery({
    queryKey: ['orcamento-grupos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_grupos' as never)
        .select('*' as never)
        .order('valor_total' as never, { ascending: false } as never) as unknown as { data: Array<{ id: string; nome: string; valor_total: number; company_id: string }> | null; error: Error | null };
      
      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIMES.configs,
  });
}
