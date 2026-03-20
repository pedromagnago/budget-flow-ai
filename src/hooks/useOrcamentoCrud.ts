import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// ── Grupo (Etapa) CRUD ──

interface CreateGrupoInput {
  nome: string;
  valor_total: number;
}

interface UpdateGrupoInput {
  id: string;
  nome?: string;
  valor_total?: number;
}

export function useCreateGrupo() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateGrupoInput) => {
      const { data, error } = await supabase
        .from('orcamento_grupos' as never)
        .insert({ ...input, company_id: companyId, ativo: true } as never)
        .select('*' as never)
        .single() as unknown as { data: { id: string } | null; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-grupos'] });
      toast.success('Etapa criada');
    },
    onError: () => toast.error('Erro ao criar etapa'),
  });
}

export function useUpdateGrupo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: UpdateGrupoInput) => {
      const { error } = await supabase
        .from('orcamento_grupos' as never)
        .update(update as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-grupos'] });
      toast.success('Etapa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });
}

export function useDeleteGrupo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orcamento_grupos' as never)
        .update({ ativo: false } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-grupos'] });
      toast.success('Etapa removida');
    },
    onError: () => toast.error('Erro ao remover'),
  });
}

// ── Item Orçamentário CRUD ──

interface CreateItemInput {
  grupo_id: string;
  item: string;
  apropriacao?: string;
  valor_orcado: number;
  unidade?: string;
}

interface UpdateItemInput {
  id: string;
  item?: string;
  apropriacao?: string;
  valor_orcado?: number;
  unidade?: string;
}

export function useCreateItem() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      const { data, error } = await supabase
        .from('orcamento_items' as never)
        .insert({
          ...input,
          company_id: companyId,
          ativo: true,
          valor_consumido: 0,
          valor_saldo: input.valor_orcado,
        } as never)
        .select('*' as never)
        .single() as unknown as { data: { id: string } | null; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-itens'] });
      toast.success('Item criado');
    },
    onError: () => toast.error('Erro ao criar item'),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: UpdateItemInput) => {
      const { error } = await supabase
        .from('orcamento_items' as never)
        .update(update as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-itens'] });
      toast.success('Item atualizado');
    },
    onError: () => toast.error('Erro ao atualizar item'),
  });
}

export function useDeleteItem() {
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
      qc.invalidateQueries({ queryKey: ['etapas-completas'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['orcamento-itens'] });
      toast.success('Item removido');
    },
    onError: () => toast.error('Erro ao remover'),
  });
}

// ── Query items por grupo ──

import { useQuery } from '@tanstack/react-query';

export function useOrcamentoItens(grupoId: string | null) {
  return useQuery({
    queryKey: ['orcamento-itens', grupoId],
    queryFn: async () => {
      if (!grupoId) return [];
      const { data, error } = await supabase
        .from('orcamento_items' as never)
        .select('*' as never)
        .eq('grupo_id' as never, grupoId as never)
        .eq('ativo' as never, true as never)
        .order('item' as never) as unknown as { data: Array<{
          id: string; grupo_id: string; item: string; apropriacao: string;
          valor_orcado: number; valor_consumido: number; valor_saldo: number; unidade: string;
        }> | null; error: Error | null };
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!grupoId,
  });
}
