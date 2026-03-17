import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/constants';

interface ClassificacaoIA {
  id: string;
  fornecedor_extraido: string | null;
  cnpj_extraido: string | null;
  valor_extraido: number | null;
  data_vencimento_ext: string | null;
  departamento_proposto: string | null;
  categoria_proposta: string | null;
  score_confianca: number | null;
  status_auditoria: string;
  justificativa_ia: string | null;
  created_at: string;
  documento_id: string;
}

export function useAuditQueue() {
  return useQuery({
    queryKey: ['audit-queue'],
    queryFn: async (): Promise<ClassificacaoIA[]> => {
      const { data, error } = await supabase
        .from('classificacoes_ia' as never)
        .select('*' as never)
        .order('created_at' as never, { ascending: true } as never) as unknown as { data: ClassificacaoIA[] | null; error: Error | null };
      
      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIMES.saldos,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classificacoes_ia' as never)
        .select('status_auditoria, score_confianca' as never) as unknown as { data: Array<{ status_auditoria: string; score_confianca: number }> | null; error: Error | null };
      
      if (error) throw error;
      const items = data ?? [];
      
      const pendentes = items.filter(i => i.status_auditoria === 'pendente').length;
      const aprovadas = items.filter(i => i.status_auditoria === 'aprovado').length;
      const total = items.length;
      const avgScore = total > 0 ? items.reduce((s, i) => s + (i.score_confianca ?? 0), 0) / total : 0;
      
      return { pendentes, aprovadas, total, avgScore };
    },
    staleTime: STALE_TIMES.dashboard,
  });
}
