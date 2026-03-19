import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { STALE_TIMES } from '@/lib/constants';

// ── Contas (view) ──

export interface ContaSaldo {
  id: string;
  company_id: string;
  nome: string;
  banco: string;
  tipo: string;
  saldo_inicial: number;
  data_saldo_inicial: string;
  ativo: boolean;
  movimentacoes_total: number;
  saldo_atual: number;
  pendentes_conciliacao: number;
}

export function useContasSaldo() {
  return useQuery({
    queryKey: ['contas-saldo'],
    queryFn: async (): Promise<ContaSaldo[]> => {
      const { data, error } = await supabase
        .from('vw_saldo_contas')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return (data ?? []).map(c => ({
        ...c,
        id: c.id!,
        company_id: c.company_id!,
        nome: c.nome!,
        banco: c.banco!,
        tipo: c.tipo!,
        saldo_inicial: Number(c.saldo_inicial ?? 0),
        data_saldo_inicial: c.data_saldo_inicial!,
        ativo: c.ativo ?? true,
        movimentacoes_total: Number(c.movimentacoes_total ?? 0),
        saldo_atual: Number(c.saldo_atual ?? 0),
        pendentes_conciliacao: Number(c.pendentes_conciliacao ?? 0),
      }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

// ── Contas CRUD ──

export function useCreateConta() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (input: {
      nome: string; banco: string; agencia?: string; conta?: string;
      tipo: string; saldo_inicial: number; data_saldo_inicial: string;
    }) => {
      const { error } = await supabase.from('contas_bancarias').insert({
        ...input, company_id: companyId ?? 'default',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-saldo'] }),
  });
}

export function useUpdateConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from('contas_bancarias')
        .update(updates as Record<string, unknown>).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas-saldo'] }),
  });
}

// ── Ajuste de saldo ──

export function useAjustarSaldo() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      conta_id: string; data: string;
      saldo_anterior: number; saldo_correto: number; motivo: string;
    }) => {
      const cid = companyId ?? 'default';
      // Insert ajuste
      const { error: ae } = await supabase.from('ajustes_saldo').insert({
        ...input, company_id: cid, created_by: user?.id,
      });
      if (ae) throw ae;
      // Create movimentação de ajuste
      const diff = input.saldo_correto - input.saldo_anterior;
      const { error: me } = await supabase.from('movimentacoes_bancarias').insert({
        company_id: cid, conta_id: input.conta_id, data: input.data,
        descricao: `Ajuste de saldo: ${input.motivo}`,
        valor: diff, tipo: 'ajuste', conciliado: true,
        conciliado_em: new Date().toISOString(), created_by: user?.id,
      });
      if (me) throw me;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

// ── Movimentações ──

export interface Movimentacao {
  id: string;
  company_id: string;
  conta_id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string | null;
  grupo_id: string | null;
  item_id: string | null;
  lancamento_id: string | null;
  fornecedor: string | null;
  documento: string | null;
  conciliado: boolean;
  conciliado_em: string | null;
  transferencia_id: string | null;
  observacao: string | null;
  created_at: string;
}

export function useMovimentacoes(filters?: {
  contaIds?: string[];
  tipo?: string;
  conciliado?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['movimentacoes', filters],
    queryFn: async (): Promise<Movimentacao[]> => {
      let q = supabase.from('movimentacoes_bancarias').select('*')
        .order('data', { ascending: false })
        .limit(500);

      if (filters?.contaIds?.length) q = q.in('conta_id', filters.contaIds);
      if (filters?.tipo && filters.tipo !== 'todos') {
        if (filters.tipo === 'entrada') q = q.eq('tipo', 'entrada');
        else if (filters.tipo === 'saida') q = q.eq('tipo', 'saida');
        else if (filters.tipo === 'transferencia') q = q.in('tipo', ['transferencia_entrada', 'transferencia_saida']);
        else if (filters.tipo === 'ajuste') q = q.eq('tipo', 'ajuste');
      }
      if (filters?.conciliado === 'sim') q = q.eq('conciliado', true);
      if (filters?.conciliado === 'nao') q = q.eq('conciliado', false);
      if (filters?.dataInicio) q = q.gte('data', filters.dataInicio);
      if (filters?.dataFim) q = q.lte('data', filters.dataFim);
      if (filters?.search) q = q.or(`descricao.ilike.%${filters.search}%,fornecedor.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(m => ({ ...m, valor: Number(m.valor) }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useCreateMovimentacao() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      conta_id: string; data: string; descricao: string; valor: number;
      tipo: string; fornecedor?: string; documento?: string;
      categoria?: string; grupo_id?: string; item_id?: string;
      lancamento_id?: string; observacao?: string;
    }) => {
      const finalValor = input.tipo === 'saida' ? -Math.abs(input.valor) : Math.abs(input.valor);
      const { error } = await supabase.from('movimentacoes_bancarias').insert({
        ...input, valor: finalValor, company_id: companyId ?? 'default',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
    },
  });
}

export function useUpdateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from('movimentacoes_bancarias')
        .update(updates as Record<string, unknown>).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
    },
  });
}

// ── Transferências ──

export function useCreateTransferencia() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      conta_origem: string; conta_destino: string;
      data: string; valor: number; descricao: string;
    }) => {
      const cid = companyId ?? 'default';
      const transferId = crypto.randomUUID();
      const base = {
        company_id: cid, data: input.data, descricao: input.descricao,
        transferencia_id: transferId, conciliado: true,
        conciliado_em: new Date().toISOString(), created_by: user?.id,
      };
      const { error: e1 } = await supabase.from('movimentacoes_bancarias').insert({
        ...base, conta_id: input.conta_origem,
        valor: -Math.abs(input.valor), tipo: 'transferencia_saida',
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('movimentacoes_bancarias').insert({
        ...base, conta_id: input.conta_destino,
        valor: Math.abs(input.valor), tipo: 'transferencia_entrada',
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
      qc.invalidateQueries({ queryKey: ['transferencias'] });
    },
  });
}

export function useTransferencias() {
  return useQuery({
    queryKey: ['transferencias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('movimentacoes_bancarias')
        .select('*')
        .in('tipo', ['transferencia_entrada', 'transferencia_saida'])
        .order('data', { ascending: false })
        .limit(200);
      if (error) throw error;
      // Group by transferencia_id
      const grouped: Record<string, Movimentacao[]> = {};
      (data ?? []).forEach(m => {
        const tid = m.transferencia_id;
        if (!tid) return;
        if (!grouped[tid]) grouped[tid] = [];
        grouped[tid].push({ ...m, valor: Number(m.valor) });
      });
      return Object.entries(grouped).map(([tid, movs]) => {
        const saida = movs.find(m => m.tipo === 'transferencia_saida');
        const entrada = movs.find(m => m.tipo === 'transferencia_entrada');
        return {
          transferencia_id: tid,
          data: saida?.data ?? entrada?.data ?? '',
          conta_origem_id: saida?.conta_id ?? '',
          conta_destino_id: entrada?.conta_id ?? '',
          valor: Math.abs(saida?.valor ?? entrada?.valor ?? 0),
          descricao: saida?.descricao ?? '',
          movs,
        };
      });
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useDeleteTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transferenciaId: string) => {
      const { error } = await supabase.from('movimentacoes_bancarias')
        .delete().eq('transferencia_id', transferenciaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
      qc.invalidateQueries({ queryKey: ['transferencias'] });
    },
  });
}

// ── Conciliação ──

export interface LancamentoPendente {
  id: string;
  data_vencimento: string | null;
  fornecedor_razao: string | null;
  valor: number;
  status_calculado: string | null;
  tipo: string | null;
}

export function useLancamentosPendentes() {
  return useQuery({
    queryKey: ['lancamentos-pendentes-conciliacao'],
    queryFn: async (): Promise<LancamentoPendente[]> => {
      const { data, error } = await supabase
        .from('vw_lancamentos_status')
        .select('id, data_vencimento, fornecedor_razao, valor, status_calculado, tipo')
        .in('status_calculado', ['pendente', 'atrasado', 'vence_em_breve'])
        .is('movimentacao_id', null)
        .order('data_vencimento', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(l => ({ ...l, id: l.id!, valor: Number(l.valor ?? 0) }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useMovimentacoesSemLancamento() {
  return useQuery({
    queryKey: ['movimentacoes-sem-lancamento'],
    queryFn: async (): Promise<Movimentacao[]> => {
      const { data, error } = await supabase
        .from('movimentacoes_bancarias')
        .select('*')
        .is('lancamento_id', null)
        .eq('conciliado', false)
        .not('tipo', 'in', '("transferencia_entrada","transferencia_saida","ajuste")')
        .order('data', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(m => ({ ...m, valor: Number(m.valor) }));
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useConciliar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lancamentoId, movimentacaoId, data, valor }: {
      lancamentoId: string; movimentacaoId: string; data: string; valor: number;
    }) => {
      const { error: e1 } = await supabase.from('lancamentos').update({
        movimentacao_id: movimentacaoId, data_pagamento: data,
        valor_pago: Math.abs(valor), conciliado: true,
      }).eq('id', lancamentoId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('movimentacoes_bancarias').update({
        lancamento_id: lancamentoId, conciliado: true,
        conciliado_em: new Date().toISOString(), conciliado_por: user?.id,
      }).eq('id', movimentacaoId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-pendentes-conciliacao'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes-sem-lancamento'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['contas-saldo'] });
    },
  });
}
