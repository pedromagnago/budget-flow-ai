import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/constants';

export interface Documento {
  id: string;
  nome_arquivo: string;
  status: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  created_at: string;
  storage_path: string;
  erro_detalhe: string | null;
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<Documento[]> => {
      const { data, error } = await supabase
        .from('documentos' as never)
        .select('*' as never)
        .order('created_at' as never, { ascending: false } as never) as unknown as { data: Documento[] | null; error: Error | null };

      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

export interface DocumentClassification {
  id: string;
  fornecedor_extraido: string | null;
  departamento_proposto: string | null;
  categoria_proposta: string | null;
  score_confianca: number | null;
  status_auditoria: string;
  motivo_rejeicao: string | null;
  valor_extraido: number | null;
}

export function useDocumentClassification(documentoId: string | null) {
  return useQuery({
    queryKey: ['doc-classification', documentoId],
    queryFn: async (): Promise<DocumentClassification | null> => {
      if (!documentoId) return null;
      const { data, error } = await supabase
        .from('classificacoes_ia' as never)
        .select('id, fornecedor_extraido, departamento_proposto, categoria_proposta, score_confianca, status_auditoria, motivo_rejeicao, valor_extraido' as never)
        .eq('documento_id' as never, documentoId as never)
        .maybeSingle() as unknown as { data: DocumentClassification | null; error: Error | null };

      if (error) throw error;
      return data;
    },
    enabled: !!documentoId,
    staleTime: STALE_TIMES.saldos,
  });
}
