import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useAuth } from './useAuth';
import { STALE_TIMES } from '@/lib/constants';
import { usePrevisoesPlanejamento, type PrevisaoProjetada } from './usePrevisoesPlanejamento';
import type { Tables } from '@/integrations/supabase/types';

export type Cenario = Tables<'cenarios'>;
export type CenarioAjuste = Tables<'cenario_ajustes'>;

export interface PrevisaoSimulada {
  id: string;
  etapa_nome: string;
  servico_nome: string;
  item_nome: string;
  valor: number;
  data_vencimento: string | null;
  fornecedor_razao: string | null;
  departamento: string | null;
  tipo: string;
  grupo_id: string;
  servico_id: string;
  // Simulated
  ajuste?: CenarioAjuste;
  valor_simulado: number;
  vencimento_simulado: string | null;
  editado: boolean;
}

export interface FluxoDia {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
}

// ── Cenários CRUD ──
export function useCenarios() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['cenarios', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.dashboard,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cenarios')
        .select('*')
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Cenario[];
    },
  });
}

export function useCreateCenario() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string }) => {
      const { data, error } = await supabase
        .from('cenarios')
        .insert({ ...input, company_id: companyId!, criado_por: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as Cenario;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cenarios'] }),
  });
}

export function useDeleteCenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cenarios').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cenarios'] }),
  });
}

// ── Previsões from planning hierarchy ──
export function usePrevisoes() {
  const { previsoes, isLoading } = usePrevisoesPlanejamento();

  // Transform PrevisaoProjetada[] → flat list compatible with simulator
  const data = previsoes.map((p): PrevisaoSimulada => ({
    id: p.id,
    etapa_nome: p.etapa_nome,
    servico_nome: p.servico_nome,
    item_nome: p.item_nome,
    valor: p.valor_total,
    data_vencimento: p.data_vencimento_projetada,
    fornecedor_razao: p.fornecedor_nome,
    departamento: p.etapa_nome,
    tipo: 'despesa',
    grupo_id: p.grupo_id,
    servico_id: p.servico_id,
    valor_simulado: p.valor_total,
    vencimento_simulado: p.data_vencimento_projetada,
    editado: false,
  }));

  return { data, isLoading };
}

// ── Ajustes de um cenário ──
export function useAjustesCenario(cenarioId: string | null) {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['cenario_ajustes', cenarioId],
    enabled: !!cenarioId && !!companyId,
    staleTime: STALE_TIMES.saldos,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cenario_ajustes')
        .select('*')
        .eq('cenario_id', cenarioId!)
        .eq('company_id', companyId!);
      if (error) throw error;
      return data as CenarioAjuste[];
    },
  });
}

export function useSaveAjuste() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (input: {
      cenario_id: string;
      referencia_id: string;
      tipo_ajuste: string;
      campo_alterado: string;
      valor_original: string;
      valor_novo: string;
      justificativa?: string;
    }) => {
      await supabase
        .from('cenario_ajustes')
        .delete()
        .eq('cenario_id', input.cenario_id)
        .eq('referencia_id', input.referencia_id)
        .eq('campo_alterado', input.campo_alterado)
        .eq('company_id', companyId!);

      const { error } = await supabase.from('cenario_ajustes').insert({
        ...input,
        company_id: companyId!,
        referencia_tipo: 'orcamento_item',
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['cenario_ajustes', vars.cenario_id] }),
  });
}

export function useRemoveAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; cenario_id: string }) => {
      const { error } = await supabase.from('cenario_ajustes').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['cenario_ajustes', vars.cenario_id] }),
  });
}

// ── Merge previsões + ajustes ──
export function mergePrevisoes(previsoes: PrevisaoSimulada[], ajustes: CenarioAjuste[]): PrevisaoSimulada[] {
  const ajusteMap = new Map<string, CenarioAjuste[]>();
  ajustes.forEach(a => {
    const list = ajusteMap.get(a.referencia_id ?? '') ?? [];
    list.push(a);
    ajusteMap.set(a.referencia_id ?? '', list);
  });

  return previsoes.map(p => {
    const myAjustes = ajusteMap.get(p.id) ?? [];
    let valor_simulado = p.valor;
    let vencimento_simulado = p.data_vencimento;
    let editado = false;
    let lastAjuste: CenarioAjuste | undefined;

    myAjustes.forEach(a => {
      if (a.campo_alterado === 'valor' && a.valor_novo) {
        valor_simulado = parseFloat(a.valor_novo);
        editado = true;
        lastAjuste = a;
      }
      if (a.campo_alterado === 'data_vencimento' && a.valor_novo) {
        vencimento_simulado = a.valor_novo;
        editado = true;
        lastAjuste = a;
      }
    });

    return { ...p, valor_simulado, vencimento_simulado, editado, ajuste: lastAjuste };
  });
}

// ── Calcular fluxo de caixa ──
export function calcularFluxo(previsoes: PrevisaoSimulada[]): FluxoDia[] {
  const map = new Map<string, { entradas: number; saidas: number }>();

  previsoes.forEach(p => {
    const data = p.vencimento_simulado ?? p.data_vencimento ?? '';
    if (!data) return;
    const day = data.substring(0, 10);
    const curr = map.get(day) ?? { entradas: 0, saidas: 0 };
    const val = Math.abs(p.valor_simulado);
    if (p.tipo === 'receita') curr.entradas += val;
    else curr.saidas += val;
    map.set(day, curr);
  });

  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  let acumulado = 0;
  return sorted.map(([data, { entradas, saidas }]) => {
    const saldo = entradas - saidas;
    acumulado += saldo;
    return { data, entradas, saidas, saldo, saldoAcumulado: acumulado };
  });
}

// ── Métricas resumo ──
export function calcularMetricas(fluxo: FluxoDia[]) {
  let saldoMinimo = Infinity;
  let piorDia = '';
  let diasNegativo = 0;

  fluxo.forEach(f => {
    if (f.saldoAcumulado < saldoMinimo) {
      saldoMinimo = f.saldoAcumulado;
      piorDia = f.data;
    }
    if (f.saldoAcumulado < 0) diasNegativo++;
  });

  return {
    saldoMinimo: saldoMinimo === Infinity ? 0 : saldoMinimo,
    piorDia,
    diasNegativo,
    totalDias: fluxo.length,
  };
}
