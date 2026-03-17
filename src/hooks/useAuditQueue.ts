import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/constants';

export interface ClassificacaoIA {
  id: string;
  fornecedor_extraido: string | null;
  cnpj_extraido: string | null;
  valor_extraido: number | null;
  data_vencimento_ext: string | null;
  departamento_proposto: string | null;
  categoria_proposta: string | null;
  grupo_proposto: string | null;
  score_confianca: number | null;
  status_auditoria: string;
  justificativa_ia: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  documento_id: string;
  orcamento_item_id: string | null;
  valor_orcado_item: number | null;
  valor_ja_consumido: number | null;
  valor_saldo_antes: number | null;
  valor_saldo_depois: number | null;
  itens_extraidos: Record<string, unknown>[] | null;
  correcoes: Record<string, unknown> | null;
  auditado_em: string | null;
  auditado_por: string | null;
  company_id: string;
}

export interface AuditFilters {
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  departamento?: string;
}

export function useAuditQueue(filters?: AuditFilters) {
  return useQuery({
    queryKey: ['audit-queue', filters],
    queryFn: async (): Promise<ClassificacaoIA[]> => {
      let query = supabase
        .from('classificacoes_ia' as never)
        .select('*' as never)
        .order('created_at' as never, { ascending: true } as never);

      if (filters?.status) {
        query = query.eq('status_auditoria' as never, filters.status as never);
      }
      if (filters?.scoreMin !== undefined) {
        query = query.gte('score_confianca' as never, filters.scoreMin as never);
      }
      if (filters?.scoreMax !== undefined) {
        query = query.lte('score_confianca' as never, filters.scoreMax as never);
      }
      if (filters?.departamento) {
        query = query.eq('departamento_proposto' as never, filters.departamento as never);
      }

      const { data, error } = await query as unknown as { data: ClassificacaoIA[] | null; error: Error | null };
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
        .select('status_auditoria, score_confianca, auditado_em' as never) as unknown as {
          data: Array<{ status_auditoria: string; score_confianca: number; auditado_em: string | null }> | null;
          error: Error | null;
        };

      if (error) throw error;
      const items = data ?? [];

      const pendentes = items.filter(i => i.status_auditoria === 'pendente').length;
      const today = new Date().toISOString().slice(0, 10);
      const aprovadasHoje = items.filter(i =>
        i.status_auditoria === 'aprovado' && i.auditado_em?.slice(0, 10) === today
      ).length;
      const total = items.length;
      const avgScore = total > 0 ? items.reduce((s, i) => s + (i.score_confianca ?? 0), 0) / total : 0;
      const aprovadas = items.filter(i => i.status_auditoria === 'aprovado').length;
      const taxaAcerto = total > 0 ? aprovadas / total : 0;

      return { pendentes, aprovadasHoje, aprovadas, total, avgScore, taxaAcerto };
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

export function useAuditApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classificacoes_ia' as never)
        .update({
          status_auditoria: 'aprovado',
          auditado_em: new Date().toISOString(),
        } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;

      // Insert audit log
      const { error: logError } = await supabase
        .from('audit_logs' as never)
        .insert({
          tabela: 'classificacoes_ia',
          registro_id: id,
          acao: 'APPROVE',
          agente: 'humano',
        } as never) as unknown as { error: Error | null };
      if (logError) console.error('Audit log error:', logError);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-queue'] });
      qc.invalidateQueries({ queryKey: ['audit-stats'] });
    },
  });
}

export function useAuditReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('classificacoes_ia' as never)
        .update({
          status_auditoria: 'rejeitado',
          motivo_rejeicao: motivo,
          auditado_em: new Date().toISOString(),
        } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;

      await supabase
        .from('audit_logs' as never)
        .insert({
          tabela: 'classificacoes_ia',
          registro_id: id,
          acao: 'REJECT',
          agente: 'humano',
          metadata: { motivo },
        } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-queue'] });
      qc.invalidateQueries({ queryKey: ['audit-stats'] });
    },
  });
}

export function useAuditCorrect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, correcoes }: { id: string; correcoes: Record<string, string | number | null> }) => {
      const { error } = await supabase
        .from('classificacoes_ia' as never)
        .update({
          status_auditoria: 'corrigido',
          correcoes,
          auditado_em: new Date().toISOString(),
          ...correcoes,
        } as never)
        .eq('id' as never, id as never) as unknown as { error: Error | null };
      if (error) throw error;

      await supabase
        .from('audit_logs' as never)
        .insert({
          tabela: 'classificacoes_ia',
          registro_id: id,
          acao: 'CORRECT',
          agente: 'humano',
          metadata: { correcoes },
        } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-queue'] });
      qc.invalidateQueries({ queryKey: ['audit-stats'] });
    },
  });
}
