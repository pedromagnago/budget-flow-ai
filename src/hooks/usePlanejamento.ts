import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';

// ── Serviços com situação ──

export interface ServicoSituacao {
  id: string;
  nome: string;
  codigo: string | null;
  grupo_id: string | null;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  valor_total: number;
  responsavel: string | null;
  data_inicio_plan: string | null;
  data_fim_plan: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  status: string;
  ordem: number;
  situacao_calculada: string;
  dias_atraso: number;
}

export function useServicosSituacao() {
  return useQuery({
    queryKey: ['servicos-situacao'],
    queryFn: async (): Promise<ServicoSituacao[]> => {
      const { data, error } = await supabase
        .from('vw_servicos_situacao' as never)
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return ((data as unknown as ServicoSituacao[]) ?? []).map(s => ({
        ...s,
        valor_total: Number(s.valor_total),
        preco_unitario: s.preco_unitario ? Number(s.preco_unitario) : null,
        dias_atraso: Number(s.dias_atraso ?? 0),
        ordem: Number(s.ordem ?? 0),
      }));
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

// ── Medições financeiro ──

export interface MedicaoFinanceiro {
  id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_planejado: number;
  valor_liberado: number;
  status: string;
  data_real_liberacao: string | null;
  lancamento_receita_id: string | null;
  previsao_liberacao: string | null;
  status_financeiro: string;
}

export function useMedicoesFinanceiro() {
  return useQuery({
    queryKey: ['medicoes-financeiro'],
    queryFn: async (): Promise<MedicaoFinanceiro[]> => {
      const { data, error } = await supabase
        .from('vw_medicoes_financeiro' as never)
        .select('*')
        .order('numero', { ascending: true });
      if (error) throw error;
      return ((data as unknown as MedicaoFinanceiro[]) ?? []).map(m => ({
        ...m,
        valor_planejado: Number(m.valor_planejado),
        valor_liberado: Number(m.valor_liberado ?? 0),
      }));
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

// ── Impactos ──

export interface ImpactoFisicoFinanceiro {
  id: string;
  company_id: string;
  tipo: string;
  servico_id: string | null;
  medicao_id: string | null;
  descricao: string | null;
  desvio_dias: number | null;
  desvio_percentual: number | null;
  impacto_financeiro: number | null;
  acao_tomada: string;
  resolvido: boolean;
  created_at: string;
}

export function useImpactos(resolvido?: boolean) {
  return useQuery({
    queryKey: ['impactos', resolvido],
    queryFn: async (): Promise<ImpactoFisicoFinanceiro[]> => {
      let q = supabase
        .from('impactos_fisico_financeiro' as never)
        .select('*')
        .order('created_at', { ascending: false });
      if (resolvido !== undefined) {
        q = q.eq('resolvido', resolvido);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as ImpactoFisicoFinanceiro[]) ?? [];
    },
    staleTime: STALE_TIMES.saldos,
  });
}

// ── Mutations ──

export function useUpdateServicoPlanning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('cronograma_servicos')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicos-situacao'] });
      qc.invalidateQueries({ queryKey: ['cronograma-servicos'] });
    },
  });
}

export function useLiberarMedicao() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: {
      medicaoId: string;
      valorLiberado: number;
      dataLiberacao: string;
      observacao?: string;
      medicaoNumero: number;
      lancamentoExistenteId?: string | null;
    }) => {
      const cid = companyId ?? 'default';

      // Update medicao
      const { error: mErr } = await supabase
        .from('medicoes')
        .update({
          status: 'liberada',
          data_real_liberacao: input.dataLiberacao,
          valor_liberado: input.valorLiberado,
        } as Record<string, unknown>)
        .eq('id', input.medicaoId);
      if (mErr) throw mErr;

      // Create or update lancamento de receita
      if (input.lancamentoExistenteId) {
        const { error } = await supabase
          .from('lancamentos')
          .update({ valor: input.valorLiberado } as Record<string, unknown>)
          .eq('id', input.lancamentoExistenteId);
        if (error) throw error;
      } else {
        // Calculate vencimento = liberacao + 15 days
        const venc = new Date(input.dataLiberacao);
        venc.setDate(venc.getDate() + 15);

        const { data: newLanc, error: lErr } = await supabase
          .from('lancamentos')
          .insert({
            company_id: cid,
            tipo: 'receita',
            valor: input.valorLiberado,
            data_vencimento: venc.toISOString().split('T')[0],
            data_emissao: input.dataLiberacao,
            fornecedor_razao: `Medição M${input.medicaoNumero}`,
            departamento: 'Receita',
            categoria: 'Medição',
            situacao: 'pendente',
            e_previsao: false,
            observacao: input.observacao || `Liberação Medição M${input.medicaoNumero}`,
          })
          .select('id')
          .single();
        if (lErr) throw lErr;

        // Link lancamento to medicao
        if (newLanc) {
          await supabase
            .from('medicoes')
            .update({ lancamento_receita_id: newLanc.id } as Record<string, unknown>)
            .eq('id', input.medicaoId);
        }
      }

      // Create impacto record
      await supabase
        .from('impactos_fisico_financeiro' as never)
        .insert({
          company_id: cid,
          tipo: 'medicao_liberada',
          medicao_id: input.medicaoId,
          descricao: `Medição M${input.medicaoNumero} liberada — R$ ${input.valorLiberado.toLocaleString('pt-BR')}`,
          acao_tomada: 'lancamento_criado',
          resolvido: true,
          resolvido_em: new Date().toISOString(),
        } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicoes'] });
      qc.invalidateQueries({ queryKey: ['medicoes-financeiro'] });
      qc.invalidateQueries({ queryKey: ['impactos'] });
    },
  });
}

export function useResolveImpacto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, acao }: { id: string; acao: string }) => {
      const { error } = await supabase
        .from('impactos_fisico_financeiro' as never)
        .update({
          acao_tomada: acao,
          resolvido: true,
          resolvido_em: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['impactos'] }),
  });
}
