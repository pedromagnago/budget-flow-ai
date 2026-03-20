import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { STALE_TIMES } from '@/lib/constants';

// ── Tipos ──

export type FasePipeline =
  | 'previsao'
  | 'aguardando_aprovacao'
  | 'rejeitado'
  | 'a_pagar'
  | 'vence_em_breve'
  | 'atrasado'
  | 'pago'
  | 'cancelado';

export interface LancamentoPipeline {
  id: string;
  company_id: string;
  tipo: string;
  valor: number;
  valor_pago: number;
  fornecedor_razao: string | null;
  fornecedor_id: string | null;
  departamento: string | null;
  departamento_limpo: string | null;
  categoria: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  e_previsao: boolean | null;
  conciliado: boolean | null;
  status_aprovacao: string | null;
  aprovado_por: string | null;
  orcamento_item_id: string | null;
  forma_pagamento: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  observacao: string | null;
  created_at: string | null;
  fase: FasePipeline;
  dias_ate_vencimento: number | null;
  orcamento_item_nome: string | null;
  orcamento_valor_orcado: number | null;
  orcamento_valor_consumido: number | null;
  etapa_nome: string | null;
}

export interface PipelineResumo {
  company_id: string;
  tipo: string;
  fase: FasePipeline;
  total_lancamentos: number;
  valor_total: number;
  valor_pago_total: number;
}

// ── Configuração das fases ──

export const FASE_CONFIG: Record<FasePipeline, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  order: number;
}> = {
  previsao: {
    label: 'Previsão',
    color: '#94a3b8',
    bgClass: 'bg-slate-100 dark:bg-slate-800/40',
    textClass: 'text-slate-600 dark:text-slate-400',
    order: 0,
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprovação',
    color: '#f59e0b',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    order: 1,
  },
  rejeitado: {
    label: 'Rejeitado',
    color: '#ef4444',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    textClass: 'text-red-600 dark:text-red-400',
    order: 2,
  },
  a_pagar: {
    label: 'Aprovado / A Pagar',
    color: '#3b82f6',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    textClass: 'text-blue-600 dark:text-blue-400',
    order: 3,
  },
  vence_em_breve: {
    label: 'Vence em Breve',
    color: '#f97316',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    order: 4,
  },
  atrasado: {
    label: 'Atrasado',
    color: '#dc2626',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    order: 5,
  },
  pago: {
    label: 'Pago',
    color: '#10b981',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    order: 6,
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6b7280',
    bgClass: 'bg-gray-100 dark:bg-gray-800/40',
    textClass: 'text-gray-500',
    order: 7,
  },
};

// Fases visíveis no pipeline (exclui cancelado)
export const PIPELINE_FASES: FasePipeline[] = [
  'previsao',
  'aguardando_aprovacao',
  'a_pagar',
  'vence_em_breve',
  'atrasado',
  'pago',
];

// ── Hooks ──

export function usePipelineFinanceiro(tipo: 'despesa' | 'receita') {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['pipeline-financeiro', tipo, companyId],
    queryFn: async (): Promise<LancamentoPipeline[]> => {
      const { data, error } = await supabase
        .from('vw_pipeline_financeiro' as never)
        .select('*' as never)
        .eq('company_id', companyId!)
        .eq('tipo', tipo)
        .neq('fase', 'cancelado') as unknown as { data: LancamentoPipeline[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(l => ({
        ...l,
        valor: Number(l.valor ?? 0),
        valor_pago: Number(l.valor_pago ?? 0),
        orcamento_valor_orcado: l.orcamento_valor_orcado ? Number(l.orcamento_valor_orcado) : null,
        orcamento_valor_consumido: l.orcamento_valor_consumido ? Number(l.orcamento_valor_consumido) : null,
      }));
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.saldos,
  });
}

export function usePipelineResumo() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['pipeline-resumo', companyId],
    queryFn: async (): Promise<PipelineResumo[]> => {
      const { data, error } = await supabase
        .from('vw_pipeline_resumo' as never)
        .select('*' as never)
        .eq('company_id', companyId!) as unknown as { data: PipelineResumo[] | null; error: Error | null };

      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        valor_total: Number(r.valor_total ?? 0),
        valor_pago_total: Number(r.valor_pago_total ?? 0),
      }));
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.saldos,
  });
}

// ── Mutations de aprovação ──

export function useAprovarLancamento() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lancamentoId: string) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          status_aprovacao: 'aprovado',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        } as any)
        .eq('id', lancamentoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-financeiro'] });
      qc.invalidateQueries({ queryKey: ['pipeline-resumo'] });
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useRejeitarLancamento() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          status_aprovacao: 'rejeitado',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivo,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-financeiro'] });
      qc.invalidateQueries({ queryKey: ['pipeline-resumo'] });
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useAprovarEmLote() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          status_aprovacao: 'aprovado',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-financeiro'] });
      qc.invalidateQueries({ queryKey: ['pipeline-resumo'] });
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}
