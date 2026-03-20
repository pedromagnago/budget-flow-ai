import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { STALE_TIMES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Fornecedor, FornecedorResumo, CategoriaFornecedor } from '@/types';

// ── Lista de fornecedores ──

export function useFornecedores() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['fornecedores', companyId],
    queryFn: async (): Promise<Fornecedor[]> => {
      const { data, error } = await supabase
        .from('fornecedores' as never)
        .select('*' as never)
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .order('razao_social' as never) as unknown as { data: Fornecedor[] | null; error: Error | null };
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.configs,
  });
}

// ── Resumo por fornecedor (view agregada) ──

export function useFornecedorResumo() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['fornecedor-resumo', companyId],
    queryFn: async (): Promise<FornecedorResumo[]> => {
      const { data, error } = await supabase
        .from('vw_fornecedor_resumo' as never)
        .select('*' as never)
        .eq('company_id', companyId!) as unknown as { data: FornecedorResumo[] | null; error: Error | null };
      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        valor_total_orcado: Number(r.valor_total_orcado),
        valor_total_lancamentos: Number(r.valor_total_lancamentos),
        valor_total_pago: Number(r.valor_total_pago),
      }));
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.dashboard,
  });
}

// ── Criar fornecedor ──

export function useCreateFornecedor() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (input: {
      razao_social: string;
      nome_fantasia?: string;
      cnpj?: string;
      email?: string;
      telefone?: string;
      categoria?: CategoriaFornecedor;
      observacoes?: string;
    }) => {
      const { data, error } = await supabase
        .from('fornecedores' as never)
        .insert({ ...input, company_id: companyId! } as never)
        .select('id' as never)
        .single() as unknown as { data: { id: string } | null; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor cadastrado');
    },
    onError: () => toast.error('Erro ao cadastrar fornecedor'),
  });
}

// ── Atualizar fornecedor ──

export function useUpdateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<Fornecedor, 'id' | 'company_id' | 'created_at'>>) => {
      const { error } = await supabase
        .from('fornecedores' as never)
        .update(updates as never)
        .eq('id', id) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] });
      qc.invalidateQueries({ queryKey: ['fornecedor-resumo'] });
      toast.success('Fornecedor atualizado');
    },
  });
}

// ── Desativar fornecedor (soft delete) ──

export function useDeactivateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores' as never)
        .update({ ativo: false } as never)
        .eq('id', id) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor desativado');
    },
  });
}
