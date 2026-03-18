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
  preco_unitario: number | null;
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
      return (data ?? []).map(s => ({ ...s, valor_total: Number(s.valor_total), preco_unitario: s.preco_unitario ? Number(s.preco_unitario) : null }));
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

// ── CRUD Medições ──

export function useCreateMedicao() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: { numero: number; data_inicio: string; data_fim: string; valor_planejado: number }) => {
      const { error } = await supabase
        .from('medicoes' as never)
        .insert({ ...input, company_id: companyId ?? 'default', status: 'futura', valor_liberado: 0 } as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicoes'] }),
  });
}

export function useUpdateMedicao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; data_inicio?: string; data_fim?: string; valor_planejado?: number; valor_liberado?: number; status?: string }) => {
      const { error } = await supabase
        .from('medicoes' as never)
        .update(updates as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicoes'] }),
  });
}

export function useDeleteMedicao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medicoes' as never)
        .delete()
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicoes'] }),
  });
}

// ── CRUD Serviços ──

export function useCreateServico() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: { nome: string; valor_total: number; quantidade?: number }) => {
      const qty = input.quantidade ?? 64;
      const preco = qty > 0 ? input.valor_total / qty : 0;
      const { error } = await supabase
        .from('cronograma_servicos' as never)
        .insert({ ...input, quantidade: qty, preco_unitario: preco, company_id: companyId ?? 'default' } as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cronograma-servicos'] }),
  });
}

export function useUpdateServico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nome?: string; valor_total?: number; quantidade?: number }) => {
      const patch: Record<string, unknown> = { ...updates };
      if (updates.valor_total !== undefined || updates.quantidade !== undefined) {
        const vt = updates.valor_total;
        const qt = updates.quantidade;
        if (vt !== undefined && qt !== undefined && qt > 0) patch.preco_unitario = vt / qt;
      }
      const { error } = await supabase
        .from('cronograma_servicos' as never)
        .update(patch as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cronograma-servicos'] }),
  });
}

export function useDeleteServico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_servicos' as never)
        .delete()
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cronograma-servicos'] }),
  });
}
