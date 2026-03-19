import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';

export interface Notificacao {
  id: string;
  company_id: string;
  user_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  lancamento_id: string | null;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notificacoes = [], ...rest } = useQuery({
    queryKey: ['notificacoes', companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('company_id', companyId!)
        .or(`user_id.eq.${user?.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `company_id=eq.${companyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['notificacoes', companyId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, qc]);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      const ids = notificacoes.filter(n => !n.lida).map(n => n.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  return { notificacoes, naoLidas, marcarLida, marcarTodasLidas, ...rest };
}

// ── Auto-generation ──

export function useGenerateNotificacoes() {
  const { companyId } = useCompany();
  const qc = useQueryClient();

  const generate = useCallback(async () => {
    if (!companyId) return;

    // Fetch lancamentos with status
    const { data: lancs } = await supabase
      .from('vw_lancamentos_status')
      .select('id, tipo, valor, fornecedor_razao, departamento, data_vencimento, status_calculado, dias_ate_vencimento')
      .eq('company_id', companyId);

    // Fetch existing notifications from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('notificacoes')
      .select('tipo, lancamento_id')
      .eq('company_id', companyId)
      .gte('created_at', since);

    const recentSet = new Set((recent ?? []).map(r => `${r.tipo}::${r.lancamento_id ?? ''}`));
    const inserts: Array<{
      company_id: string; tipo: string; titulo: string; mensagem: string; lancamento_id?: string;
    }> = [];

    const items = lancs ?? [];

    // a) Atrasados
    items.filter(l => l.status_calculado === 'atrasado' && l.tipo === 'despesa').forEach(l => {
      if (recentSet.has(`pagamento_atrasado::${l.id}`)) return;
      inserts.push({
        company_id: companyId,
        tipo: 'pagamento_atrasado',
        titulo: `Pagamento atrasado — ${l.fornecedor_razao ?? 'Sem fornecedor'}`,
        mensagem: `Venceu em ${l.data_vencimento ?? '?'} · ${formatCurrency(Math.abs(Number(l.valor ?? 0)))}`,
        lancamento_id: l.id!,
      });
    });

    // b) Vencimento hoje
    items.filter(l => l.dias_ate_vencimento === 0 && l.tipo === 'despesa' && l.status_calculado !== 'pago').forEach(l => {
      if (recentSet.has(`vencimento_hoje::${l.id}`)) return;
      inserts.push({
        company_id: companyId,
        tipo: 'vencimento_hoje',
        titulo: `Vence hoje — ${l.fornecedor_razao ?? 'Sem fornecedor'}`,
        mensagem: `${formatCurrency(Math.abs(Number(l.valor ?? 0)))} · ${l.departamento ?? ''}`,
        lancamento_id: l.id!,
      });
    });

    // c) Vencimento amanhã
    items.filter(l => l.dias_ate_vencimento === 1 && l.tipo === 'despesa' && l.status_calculado !== 'pago').forEach(l => {
      if (recentSet.has(`vencimento_amanha::${l.id}`)) return;
      inserts.push({
        company_id: companyId,
        tipo: 'vencimento_amanha',
        titulo: `Vence amanhã — ${l.fornecedor_razao ?? 'Sem fornecedor'}`,
        mensagem: `${formatCurrency(Math.abs(Number(l.valor ?? 0)))}`,
        lancamento_id: l.id!,
      });
    });

    // d) Vencimentos na semana (agrupado)
    const weekItems = items.filter(l =>
      l.tipo === 'despesa' && l.status_calculado !== 'pago' &&
      (l.dias_ate_vencimento ?? 99) > 1 && (l.dias_ate_vencimento ?? 99) <= 7
    );
    if (weekItems.length > 0 && !recentSet.has('vencimento_semana::')) {
      const total = weekItems.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0);
      inserts.push({
        company_id: companyId,
        tipo: 'vencimento_semana',
        titulo: `${weekItems.length} pagamento${weekItems.length > 1 ? 's' : ''} vence${weekItems.length > 1 ? 'm' : ''} esta semana`,
        mensagem: `Total: ${formatCurrency(total)}`,
      });
    }

    // e) Recebimentos previstos na semana
    const recebimentos = items.filter(l =>
      l.tipo === 'receita' && l.status_calculado !== 'pago' &&
      (l.dias_ate_vencimento ?? 99) >= 0 && (l.dias_ate_vencimento ?? 99) <= 7
    );
    recebimentos.forEach(l => {
      if (recentSet.has(`recebimento_previsto::${l.id}`)) return;
      inserts.push({
        company_id: companyId,
        tipo: 'recebimento_previsto',
        titulo: `Recebimento previsto — ${l.fornecedor_razao ?? 'Receita'}`,
        mensagem: `${formatCurrency(Math.abs(Number(l.valor ?? 0)))} em ${l.data_vencimento ?? '?'}`,
        lancamento_id: l.id!,
      });
    });

    // f) Desvio orçamentário
    const { data: orcGroups } = await supabase.rpc('get_orcado_vs_realizado', { _company_id: companyId });
    (orcGroups ?? []).forEach((g: any) => {
      if (g.pct_consumido > 1.1 && !recentSet.has(`desvio_orcamento::${g.grupo_id}`)) {
        inserts.push({
          company_id: companyId,
          tipo: 'desvio_orcamento',
          titulo: `Desvio em ${g.grupo}`,
          mensagem: `${((g.pct_consumido - 1) * 100).toFixed(0)}% acima do orçado`,
        });
      }
    });

    // g) Conciliação pendente
    const { data: pendentes } = await supabase
      .from('movimentacoes_bancarias')
      .select('id, data')
      .eq('company_id', companyId)
      .eq('conciliado', false)
      .order('data', { ascending: true })
      .limit(100);
    const old = (pendentes ?? []).filter(m => {
      const diff = (Date.now() - new Date(m.data).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 5;
    });
    if (old.length > 0 && !recentSet.has('conciliacao_pendente::')) {
      inserts.push({
        company_id: companyId,
        tipo: 'conciliacao_pendente',
        titulo: `${old.length} movimentações sem conciliar`,
        mensagem: `Mais antiga: ${old[0]?.data ?? '?'}`,
      });
    }

    if (inserts.length > 0) {
      await supabase.from('notificacoes').insert(inserts);
      qc.invalidateQueries({ queryKey: ['notificacoes'] });
    }
  }, [companyId, qc]);

  return generate;
}
