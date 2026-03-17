import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';

export interface Medicao {
  id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_planejado: number;
  status: string;
  valor_liberado: number;
}

export function useMedicoes() {
  return useQuery({
    queryKey: ['medicoes'],
    queryFn: async (): Promise<Medicao[]> => {
      const { data, error } = await supabase
        .from('medicoes' as never)
        .select('*' as never)
        .order('numero' as never, { ascending: true } as never) as unknown as { data: Medicao[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(m => ({ ...m, valor_planejado: Number(m.valor_planejado), valor_liberado: Number(m.valor_liberado ?? 0) }));
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

export interface CronogramaServico {
  id: string;
  nome: string;
  valor_total: number;
  quantidade: number | null;
}

export function useCronogramaServicos() {
  return useQuery({
    queryKey: ['cronograma-servicos'],
    queryFn: async (): Promise<CronogramaServico[]> => {
      const { data, error } = await supabase
        .from('cronograma_servicos' as never)
        .select('*' as never)
        .order('nome' as never, { ascending: true } as never) as unknown as { data: CronogramaServico[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(s => ({ ...s, valor_total: Number(s.valor_total) }));
    },
    staleTime: STALE_TIMES.configs,
  });
}

export interface MedicaoMeta {
  id: string;
  servico_id: string;
  medicao_numero: number;
  meta_percentual: number;
  meta_casas: number | null;
}

export function useMedicoesMetas() {
  return useQuery({
    queryKey: ['medicoes-metas'],
    queryFn: async (): Promise<MedicaoMeta[]> => {
      const { data, error } = await supabase
        .from('medicoes_metas' as never)
        .select('*' as never) as unknown as { data: MedicaoMeta[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(m => ({ ...m, meta_percentual: Number(m.meta_percentual) }));
    },
    staleTime: STALE_TIMES.configs,
  });
}

export interface AvancoFisico {
  id: string;
  servico_id: string;
  casas_concluidas: number;
  percentual_real: number | null;
  data_registro: string;
  observacoes: string | null;
}

export function useAvancoFisico() {
  return useQuery({
    queryKey: ['avanco-fisico'],
    queryFn: async (): Promise<AvancoFisico[]> => {
      const { data, error } = await supabase
        .from('avanco_fisico' as never)
        .select('*' as never)
        .order('data_registro' as never, { ascending: false } as never) as unknown as { data: AvancoFisico[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(a => ({ ...a, percentual_real: a.percentual_real ? Number(a.percentual_real) : null }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useRegisterAvanco() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async ({ servicoId, casasConcluidas, qtdTotal }: { servicoId: string; casasConcluidas: number; qtdTotal: number }) => {
      const percentual = qtdTotal > 0 ? (casasConcluidas / qtdTotal) * 100 : 0;
      const cid = companyId ?? 'default';

      const { error } = await supabase
        .from('avanco_fisico' as never)
        .insert({
          company_id: cid,
          servico_id: servicoId,
          casas_concluidas: casasConcluidas,
          percentual_real: percentual,
        } as never) as unknown as { error: Error | null };

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avanco-fisico'] });
    },
  });
}
