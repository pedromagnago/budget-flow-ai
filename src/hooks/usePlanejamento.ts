import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';

// ── Types ──

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

export interface TriggerResult {
  type: 'delay_detected' | 'early_completion' | 'partial_measurement' | 'none';
  servicoNome?: string;
  desvioPercent?: number;
  diasDesvio?: number;
  lancamentosAfetados?: number;
  diasAdiantamento?: number;
  diferenca?: number;
}

// ── Queries ──

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

// ── Trigger 1 & 3: Save avanço with delay detection + early completion ──

export function useSaveAvancoWithTriggers() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: {
      servicoId: string;
      servicoNome: string;
      medicaoNumero: number;
      casasConcluidas: number;
      qtdTotal: number;
      grupoId: string | null;
      dataFimPlan: string | null;
      dataFimReal: string | null;
      valorTotal: number;
    }): Promise<TriggerResult> => {
      const cid = companyId ?? 'default';
      const percentual = input.qtdTotal > 0 ? (input.casasConcluidas / input.qtdTotal) * 100 : 0;

      // 1. Insert avanço
      const { error: avErr } = await supabase
        .from('avanco_fisico')
        .insert({
          company_id: cid,
          servico_id: input.servicoId,
          casas_concluidas: input.casasConcluidas,
          percentual_real: percentual,
        });
      if (avErr) throw avErr;

      // 2. Fetch meta for this medicao+servico
      const { data: metaRows } = await supabase
        .from('medicoes_metas')
        .select('meta_percentual')
        .eq('servico_id', input.servicoId)
        .eq('medicao_numero', input.medicaoNumero);

      const meta = metaRows?.[0]?.meta_percentual ? Number(metaRows[0].meta_percentual) : 0;

      // 3. Fetch medicao duration
      const { data: medRows } = await supabase
        .from('medicoes')
        .select('data_inicio, data_fim')
        .eq('numero', input.medicaoNumero)
        .limit(1);

      const medDuration = medRows?.[0]
        ? Math.max(1, Math.ceil((new Date(medRows[0].data_fim).getTime() - new Date(medRows[0].data_inicio).getTime()) / 86400000))
        : 30;

      // ── Trigger 1: Delay detection ──
      if (meta > 0 && percentual < meta * 0.8) {
        const desvioPercent = Math.round((1 - percentual / meta) * 100);
        const diasDesvio = Math.round((1 - percentual / meta) * medDuration);

        // Count affected lancamentos
        let lancamentosAfetados = 0;
        if (input.grupoId) {
          const { count } = await supabase
            .from('lancamentos')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', cid)
            .not('deleted_at', 'is', null)  // active only (workaround)
            .eq('departamento', input.grupoId); // approximate link

          // More accurate: look at orcamento_items linked to this group
          const { count: countByItem } = await supabase
            .from('lancamentos')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', cid);

          lancamentosAfetados = count ?? countByItem ?? 0;
        }

        // Insert impacto
        await supabase
          .from('impactos_fisico_financeiro' as never)
          .insert({
            company_id: cid,
            tipo: 'desvio_fisico',
            servico_id: input.servicoId,
            medicao_numero: input.medicaoNumero,
            descricao: `${input.servicoNome}: ${desvioPercent}% abaixo da meta (${percentual.toFixed(1)}% vs ${meta.toFixed(1)}%)`,
            desvio_dias: diasDesvio,
            desvio_percentual: desvioPercent,
            impacto_financeiro: input.valorTotal * (desvioPercent / 100),
            acao_tomada: 'pendente',
            resolvido: false,
          } as never);

        return {
          type: 'delay_detected',
          servicoNome: input.servicoNome,
          desvioPercent,
          diasDesvio,
          lancamentosAfetados,
        };
      }

      // ── Trigger 3: Early completion ──
      if (percentual >= 100 && input.dataFimPlan) {
        const today = new Date().toISOString().split('T')[0];
        const fimPlan = input.dataFimPlan;
        if (today < fimPlan) {
          const diasAdiantamento = Math.ceil(
            (new Date(fimPlan).getTime() - new Date(today).getTime()) / 86400000
          );

          // Mark service as completed
          await supabase
            .from('cronograma_servicos')
            .update({ data_fim_real: today, status: 'concluido' } as Record<string, unknown>)
            .eq('id', input.servicoId);

          await supabase
            .from('impactos_fisico_financeiro' as never)
            .insert({
              company_id: cid,
              tipo: 'antecipacao_servico',
              servico_id: input.servicoId,
              descricao: `${input.servicoNome} concluído ${diasAdiantamento} dias antes do prazo`,
              desvio_dias: -diasAdiantamento,
              acao_tomada: 'pendente',
              resolvido: false,
            } as never);

          return {
            type: 'early_completion',
            servicoNome: input.servicoNome,
            diasAdiantamento,
          };
        }
      }

      return { type: 'none' };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avanco-fisico'] });
      qc.invalidateQueries({ queryKey: ['servicos-situacao'] });
      qc.invalidateQueries({ queryKey: ['cronograma-servicos'] });
      qc.invalidateQueries({ queryKey: ['impactos'] });
    },
  });
}

// ── Trigger 2 & 5: Liberar medição with partial measurement detection ──

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
      valorPlanejado: number;
      lancamentoExistenteId?: string | null;
    }): Promise<TriggerResult> => {
      const cid = companyId ?? 'default';

      // Fetch configurable payment deadline
      const { data: compData } = await supabase
        .from('companies')
        .select('config, razao_social')
        .eq('id', cid)
        .single();

      const prazoDias = compData?.config &&
        typeof compData.config === 'object' &&
        'prazo_padrao_medicao_dias' in (compData.config as Record<string, unknown>)
        ? Number((compData.config as Record<string, unknown>).prazo_padrao_medicao_dias)
        : 15;

      const projectName = compData?.razao_social ?? 'Projeto';

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
      const venc = new Date(input.dataLiberacao);
      venc.setDate(venc.getDate() + prazoDias);
      const descLanc = `Medição ${input.medicaoNumero} — ${projectName} — R$ ${input.valorLiberado.toLocaleString('pt-BR')}`;

      if (input.lancamentoExistenteId) {
        const { error } = await supabase
          .from('lancamentos')
          .update({ valor: input.valorLiberado, observacao: descLanc } as Record<string, unknown>)
          .eq('id', input.lancamentoExistenteId);
        if (error) throw error;
      } else {
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
            observacao: descLanc,
          })
          .select('id')
          .single();
        if (lErr) throw lErr;

        if (newLanc) {
          await supabase
            .from('medicoes')
            .update({ lancamento_receita_id: newLanc.id } as Record<string, unknown>)
            .eq('id', input.medicaoId);
        }
      }

      // Insert impacto - medição liberada
      await supabase
        .from('impactos_fisico_financeiro' as never)
        .insert({
          company_id: cid,
          tipo: 'medicao_liberada',
          medicao_id: input.medicaoId,
          medicao_numero: input.medicaoNumero,
          descricao: `Medição M${input.medicaoNumero} liberada — R$ ${input.valorLiberado.toLocaleString('pt-BR')}`,
          acao_tomada: 'lancamento_criado',
          resolvido: true,
          resolvido_em: new Date().toISOString(),
        } as never);

      // Create notification
      await supabase
        .from('notificacoes')
        .insert({
          company_id: cid,
          tipo: 'recebimento_previsto',
          titulo: `Medição M${input.medicaoNumero} liberada`,
          mensagem: `Receita de R$ ${input.valorLiberado.toLocaleString('pt-BR')} prevista para ${venc.toLocaleDateString('pt-BR')}`,
        });

      // ── Trigger 5: Partial measurement ──
      if (input.valorLiberado < input.valorPlanejado * 0.95) {
        const diferenca = input.valorPlanejado - input.valorLiberado;

        await supabase
          .from('impactos_fisico_financeiro' as never)
          .insert({
            company_id: cid,
            tipo: 'medicao_parcial',
            medicao_id: input.medicaoId,
            medicao_numero: input.medicaoNumero,
            valor_impacto: diferenca,
            descricao: `Medição M${input.medicaoNumero}: R$ ${diferenca.toLocaleString('pt-BR')} abaixo do planejado`,
            acao_tomada: 'pendente',
            resolvido: false,
          } as never);

        // Create forecast lancamento for the difference on the next measurement
        const nextMedNumero = input.medicaoNumero + 1;
        const { data: nextMed } = await supabase
          .from('medicoes')
          .select('data_fim')
          .eq('numero', nextMedNumero)
          .eq('company_id', cid)
          .single();

        const nextVenc = nextMed?.data_fim
          ? new Date(nextMed.data_fim)
          : new Date(venc.getTime() + 30 * 86400000);

        await supabase
          .from('lancamentos')
          .insert({
            company_id: cid,
            tipo: 'receita',
            valor: diferenca,
            data_vencimento: nextVenc.toISOString().split('T')[0],
            fornecedor_razao: `Diferença M${input.medicaoNumero} → M${nextMedNumero}`,
            departamento: 'Receita',
            categoria: 'Medição',
            situacao: 'pendente',
            e_previsao: true,
            observacao: `Previsão da diferença de R$ ${diferenca.toLocaleString('pt-BR')} não liberada na M${input.medicaoNumero}`,
          });

        return { type: 'partial_measurement', diferenca };
      }

      return { type: 'none' };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicoes'] });
      qc.invalidateQueries({ queryKey: ['medicoes-financeiro'] });
      qc.invalidateQueries({ queryKey: ['impactos'] });
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      qc.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

// ── Trigger 4: Date change → reprogramar lançamentos ──

export async function fetchLancamentosForReprogramming(
  companyId: string,
  grupoId: string | null,
  startDate: string,
  endDate: string,
) {
  if (!grupoId) return [];

  // Get orcamento_items for this group
  const { data: items } = await supabase
    .from('orcamento_items')
    .select('id')
    .eq('grupo_id', grupoId)
    .eq('company_id', companyId);

  if (!items?.length) return [];

  const itemIds = items.map(i => i.id);

  const { data: lancs } = await supabase
    .from('lancamentos')
    .select('id, fornecedor_razao, valor, data_vencimento')
    .eq('company_id', companyId)
    .in('orcamento_item_id', itemIds)
    .gte('data_vencimento', startDate)
    .lte('data_vencimento', endDate)
    .is('deleted_at', null);

  return (lancs ?? []).map(l => ({
    id: l.id,
    fornecedor: l.fornecedor_razao ?? '—',
    valor: Number(l.valor),
    dataAtual: l.data_vencimento ?? '',
  }));
}

export function useReprogramarLancamentos() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: {
      lancamentos: { id: string; novaData: string }[];
      servicoId: string;
      servicoNome: string;
      diasDelta: number;
    }) => {
      const cid = companyId ?? 'default';

      for (const l of input.lancamentos) {
        await supabase
          .from('lancamentos')
          .update({ data_vencimento: l.novaData } as Record<string, unknown>)
          .eq('id', l.id);
      }

      // Log each reprogramming as an impacto
      await supabase
        .from('impactos_fisico_financeiro' as never)
        .insert({
          company_id: cid,
          tipo: 'atraso_servico',
          servico_id: input.servicoId,
          descricao: `${input.lancamentos.length} lançamentos reprogramados (${input.diasDelta > 0 ? '+' : ''}${input.diasDelta} dias) por alteração em ${input.servicoNome}`,
          desvio_dias: input.diasDelta,
          acao_tomada: 'lancamento_reprogramado',
          resolvido: true,
          resolvido_em: new Date().toISOString(),
        } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      qc.invalidateQueries({ queryKey: ['impactos'] });
    },
  });
}
