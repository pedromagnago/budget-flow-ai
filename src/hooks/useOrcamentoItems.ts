import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';

export interface OrcamentoItemComGrupo {
  id: string;
  company_id: string;
  grupo_id: string;
  grupo_nome: string;
  item: string;
  apropriacao: string;
  tipo: string | null;
  unidade: string | null;
  valor_orcado: number;
  valor_consumido: number;
  valor_saldo: number;
  fornecedor_id: string | null;
  fornecedor: string | null;
}

/**
 * Retorna os itens do orçamento com nome do grupo (etapa).
 * Usado no modal de criação de lançamento para vincular ao orçamento.
 */
export function useOrcamentoItemsComGrupo() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['orcamento-items-com-grupo', companyId],
    queryFn: async (): Promise<OrcamentoItemComGrupo[]> => {
      // Supabase join: orcamento_items com orcamento_grupos
      const { data, error } = await supabase
        .from('orcamento_items')
        .select(`
          id,
          company_id,
          grupo_id,
          item,
          apropriacao,
          tipo,
          unidade,
          valor_orcado,
          valor_consumido,
          valor_saldo,
          fornecedor_id,
          orcamento_grupos!inner (
            nome
          )
        `)
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .order('item', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        company_id: row.company_id,
        grupo_id: row.grupo_id,
        grupo_nome: row.orcamento_grupos?.nome ?? '',
        item: row.item,
        apropriacao: row.apropriacao,
        tipo: row.tipo,
        unidade: row.unidade,
        valor_orcado: Number(row.valor_orcado ?? 0),
        valor_consumido: Number(row.valor_consumido ?? 0),
        valor_saldo: Number(row.valor_saldo ?? 0),
        fornecedor_id: row.fornecedor_id,
        fornecedor: row.fornecedor ?? null,
      }));
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.saldos,
  });
}
