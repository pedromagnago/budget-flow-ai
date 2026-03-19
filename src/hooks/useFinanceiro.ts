import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';

export interface LancamentoStatus {
  id: string;
  company_id: string;
  tipo: string;
  valor: number;
  valor_pago: number;
  fornecedor_razao: string | null;
  fornecedor_cnpj: string | null;
  departamento: string | null;
  departamento_limpo: string | null;
  categoria: string | null;
  observacao: string | null;
  parcela: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  data_vencimento: string | null;
  data_emissao: string | null;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  e_previsao: boolean | null;
  conciliado: boolean | null;
  situacao: string | null;
  quinzena: string | null;
  orcamento_item_id: string | null;
  conta_bancaria_id: string | null;
  movimentacao_id: string | null;
  status_calculado: string | null;
  dias_ate_vencimento: number | null;
  created_at: string | null;
}

export function useLancamentosStatus(tipo: 'despesa' | 'receita', previsaoOnly = false) {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['lancamentos-status', tipo, previsaoOnly, companyId],
    queryFn: async (): Promise<LancamentoStatus[]> => {
      let q = supabase
        .from('vw_lancamentos_status')
        .select('*')
        .eq('company_id', companyId!)
        .eq('tipo', tipo);
      if (previsaoOnly) q = q.eq('e_previsao', true);
      const { data, error } = await q.order('data_vencimento', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        id: r.id!,
        company_id: r.company_id!,
        tipo: r.tipo!,
        valor: Number(r.valor ?? 0),
        valor_pago: Number(r.valor_pago ?? 0),
      })) as LancamentoStatus[];
    },
    enabled: !!companyId,
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      tipo: string;
      valor: number;
      fornecedor_razao?: string;
      departamento?: string;
      categoria?: string;
      data_vencimento?: string;
      data_emissao?: string;
      forma_pagamento?: string;
      e_previsao?: boolean;
      observacao?: string;
      orcamento_item_id?: string;
      conta_bancaria_id?: string;
      quinzena?: string;
      numero_parcela?: number;
      total_parcelas?: number;
    }) => {
      const { error } = await supabase.from('lancamentos').insert({
        company_id: companyId!,
        created_by: user?.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useUpdateLancamento() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({ ...fields, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useSoftDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useRegistrarPagamento() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      lancamento_id: string;
      conta_bancaria_id: string;
      data_pagamento: string;
      valor_pago: number;
      documento?: string;
      observacao?: string;
      tipo_mov: 'entrada' | 'saida';
      fornecedor?: string;
    }) => {
      // 1. Update lancamento
      const { error: e1 } = await supabase
        .from('lancamentos')
        .update({
          valor_pago: input.valor_pago,
          data_pagamento: input.data_pagamento,
          conciliado: true,
          conta_bancaria_id: input.conta_bancaria_id,
        } as any)
        .eq('id', input.lancamento_id);
      if (e1) throw e1;

      // 2. Create movimentacao
      const valor = input.tipo_mov === 'saida' ? -Math.abs(input.valor_pago) : Math.abs(input.valor_pago);
      const { error: e2 } = await supabase.from('movimentacoes_bancarias').insert({
        company_id: companyId!,
        conta_id: input.conta_bancaria_id,
        data: input.data_pagamento,
        descricao: `Pagamento ${input.fornecedor ?? ''}`.trim(),
        valor,
        tipo: input.tipo_mov,
        lancamento_id: input.lancamento_id,
        documento: input.documento ?? null,
        observacao: input.observacao ?? null,
        conciliado: true,
        conciliado_em: new Date().toISOString(),
        conciliado_por: user?.id ?? null,
        created_by: user?.id ?? null,
        fornecedor: input.fornecedor ?? null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useParcelarLancamento() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      lancamento_id: string;
      tipo: string;
      valor_total: number;
      parcelas: number;
      data_primeira: string;
      intervalo: 'mensal' | 'quinzenal' | 'semanal';
      fornecedor_razao?: string;
      departamento?: string;
      categoria?: string;
      orcamento_item_id?: string;
    }) => {
      const valorParcela = Math.round((input.valor_total / input.parcelas) * 100) / 100;
      const inserts = [];
      for (let i = 0; i < input.parcelas; i++) {
        const d = new Date(input.data_primeira);
        if (input.intervalo === 'mensal') d.setMonth(d.getMonth() + i);
        else if (input.intervalo === 'quinzenal') d.setDate(d.getDate() + i * 15);
        else d.setDate(d.getDate() + i * 7);
        inserts.push({
          company_id: companyId!,
          tipo: input.tipo,
          valor: input.tipo === 'despesa' ? -Math.abs(valorParcela) : valorParcela,
          fornecedor_razao: input.fornecedor_razao ?? null,
          departamento: input.departamento ?? null,
          categoria: input.categoria ?? null,
          data_vencimento: d.toISOString().slice(0, 10),
          numero_parcela: i + 1,
          total_parcelas: input.parcelas,
          orcamento_item_id: input.orcamento_item_id ?? null,
          created_by: user?.id,
        });
      }
      // Soft delete original
      await supabase.from('lancamentos').update({ deleted_at: new Date().toISOString() } as any).eq('id', input.lancamento_id);
      const { error } = await supabase.from('lancamentos').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}

export function useConvertPrevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({ e_previsao: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
    },
  });
}
