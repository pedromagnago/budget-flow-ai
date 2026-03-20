import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface FormaPagamento {
  id: string;
  company_id: string;
  nome: string;
  tipo: string;
  parcelas_padrao: number;
  ativo: boolean;
}

export function useFormasPagamento() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['formas-pagamento', companyId],
    queryFn: async (): Promise<FormaPagamento[]> => {
      const { data, error } = await supabase
        .from('formas_pagamento' as never)
        .select('*' as never)
        .eq('ativo' as never, true as never)
        .order('nome' as never) as unknown as { data: FormaPagamento[] | null; error: Error | null };
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFormaPagamento() {
  const qc = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (input: { nome: string; tipo: string; parcelas_padrao?: number }) => {
      const { error } = await supabase
        .from('formas_pagamento' as never)
        .insert({ ...input, company_id: companyId, ativo: true } as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento'] });
      toast.success('Forma de pagamento criada');
    },
    onError: () => toast.error('Erro ao criar'),
  });
}

export function useUpdateFormaPagamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; nome?: string; tipo?: string; parcelas_padrao?: number }) => {
      const { error } = await supabase
        .from('formas_pagamento' as never)
        .update(update as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento'] });
      toast.success('Atualizado');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });
}

export function useDeleteFormaPagamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formas_pagamento' as never)
        .update({ ativo: false } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento'] });
      toast.success('Removido');
    },
    onError: () => toast.error('Erro ao remover'),
  });
}
