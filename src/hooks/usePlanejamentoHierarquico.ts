import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';
import { toast } from 'sonner';
import type { ServicoComItens, EtapaHierarquica, ItemPlanejamento } from '@/types';

// ── Query: Etapas com Serviços e Itens ──

export function useEtapasHierarquicas() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['etapas-hierarquicas', companyId],
    queryFn: async (): Promise<EtapaHierarquica[]> => {
      // 1. Buscar etapas (grupos)
      const { data: grupos, error: gErr } = await supabase
        .from('orcamento_grupos' as never)
        .select('*' as never)
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .order('nome' as never) as unknown as {
          data: Array<{ id: string; company_id: string; nome: string; valor_total: number }> | null;
          error: Error | null;
        };
      if (gErr) throw gErr;

      // 2. Buscar serviços com totais de itens (view)
      const { data: servicos, error: sErr } = await supabase
        .from('vw_servico_com_itens' as never)
        .select('*' as never)
        .eq('company_id', companyId!) as unknown as {
          data: ServicoComItens[] | null;
          error: Error | null;
        };
      if (sErr) throw sErr;

      // 3. Buscar itens vinculados a serviços
      const { data: itens, error: iErr } = await supabase
        .from('orcamento_items' as never)
        .select('*' as never)
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .not('servico_id' as never, 'is' as never, null as never) as unknown as {
          data: ItemPlanejamento[] | null;
          error: Error | null;
        };
      if (iErr) throw iErr;

      // 4. Montar árvore
      const itensMap = new Map<string, ItemPlanejamento[]>();
      (itens ?? []).forEach(it => {
        const key = it.servico_id ?? '';
        if (!itensMap.has(key)) itensMap.set(key, []);
        itensMap.get(key)!.push({
          ...it,
          valor_orcado: Number(it.valor_orcado),
          valor_consumido: Number(it.valor_consumido),
          valor_saldo: Number(it.valor_saldo),
          quantidade_total: it.quantidade_total ? Number(it.quantidade_total) : null,
          custo_unitario: it.custo_unitario ? Number(it.custo_unitario) : null,
        });
      });

      const servicosMap = new Map<string, ServicoComItens[]>();
      (servicos ?? []).forEach(sv => {
        const key = sv.grupo_id ?? '__orphan';
        if (!servicosMap.has(key)) servicosMap.set(key, []);
        servicosMap.get(key)!.push({
          ...sv,
          servico_valor_original: Number(sv.servico_valor_original),
          soma_itens_orcado: Number(sv.soma_itens_orcado),
          soma_itens_consumido: Number(sv.soma_itens_consumido),
          soma_itens_saldo: Number(sv.soma_itens_saldo),
          preco_unitario: sv.preco_unitario ? Number(sv.preco_unitario) : null,
          itens: itensMap.get(sv.servico_id) ?? [],
        });
      });

      return (grupos ?? []).map(g => {
        const srvs = servicosMap.get(g.id) ?? [];
        return {
          grupo_id: g.id,
          company_id: g.company_id,
          nome: g.nome,
          valor_total: Number(g.valor_total),
          servicos: srvs.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
          total_servicos: srvs.length,
          soma_total_itens: srvs.reduce((s, sv) => s + sv.soma_itens_orcado, 0),
        };
      });
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.dashboard,
  });
}

// ── CRUD: Item vinculado a serviço ──

interface CreateItemServicoInput {
  grupo_id: string;
  servico_id: string;
  item: string;
  apropriacao?: string;
  unidade?: string;
  quantidade_total: number;
  custo_unitario: number;
  fornecedor_id?: string;
  forma_pagamento_id?: string;
  dias_prazo_pagamento?: number;
  observacoes?: string;
}

export function useCreateItemServico() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateItemServicoInput) => {
      const valor_orcado = input.quantidade_total * input.custo_unitario;
      const { data, error } = await supabase
        .from('orcamento_items' as never)
        .insert({
          company_id: companyId,
          grupo_id: input.grupo_id,
          servico_id: input.servico_id,
          item: input.item,
          apropriacao: input.apropriacao || '',
          unidade: input.unidade || 'un',
          quantidade_total: input.quantidade_total,
          custo_unitario: input.custo_unitario,
          valor_orcado,
          valor_consumido: 0,
          fornecedor_id: input.fornecedor_id || null,
          forma_pagamento_id: input.forma_pagamento_id || null,
          dias_prazo_pagamento: input.dias_prazo_pagamento ?? 30,
          observacoes: input.observacoes || null,
          ativo: true,
        } as never)
        .select('*' as never)
        .single() as unknown as { data: { id: string } | null; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-hierarquicas'] });
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Item adicionado ao serviço');
    },
    onError: () => toast.error('Erro ao criar item'),
  });
}

interface UpdateItemServicoInput {
  id: string;
  item?: string;
  quantidade_total?: number;
  custo_unitario?: number;
  fornecedor_id?: string | null;
  forma_pagamento_id?: string | null;
  dias_prazo_pagamento?: number;
  observacoes?: string;
}

export function useUpdateItemServico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateItemServicoInput) => {
      const patch: Record<string, unknown> = { ...updates };
      // Recalculate valor_orcado if qty or price changed
      if (updates.quantidade_total !== undefined && updates.custo_unitario !== undefined) {
        patch.valor_orcado = updates.quantidade_total * updates.custo_unitario;
      }
      const { error } = await supabase
        .from('orcamento_items' as never)
        .update(patch as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-hierarquicas'] });
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Item atualizado');
    },
    onError: () => toast.error('Erro ao atualizar item'),
  });
}

export function useDeleteItemServico() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orcamento_items' as never)
        .update({ ativo: false } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-hierarquicas'] });
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Item removido');
    },
    onError: () => toast.error('Erro ao remover item'),
  });
}

// ── CRUD: Serviço vinculado a etapa ──

interface CreateServicoEtapaInput {
  grupo_id: string;
  nome: string;
  codigo?: string;
  data_inicio_plan?: string;
  data_fim_plan?: string;
  responsavel?: string;
}

export function useCreateServicoEtapa() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateServicoEtapaInput) => {
      const { data, error } = await supabase
        .from('cronograma_servicos')
        .insert({
          company_id: companyId ?? 'default',
          grupo_id: input.grupo_id,
          nome: input.nome,
          codigo: input.codigo || null,
          data_inicio_plan: input.data_inicio_plan || null,
          data_fim_plan: input.data_fim_plan || null,
          responsavel: input.responsavel || null,
          valor_total: 0,
          status: 'futuro',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-hierarquicas'] });
      qc.invalidateQueries({ queryKey: ['servicos-situacao'] });
      qc.invalidateQueries({ queryKey: ['cronograma-servicos'] });
      toast.success('Serviço criado');
    },
    onError: () => toast.error('Erro ao criar serviço'),
  });
}
