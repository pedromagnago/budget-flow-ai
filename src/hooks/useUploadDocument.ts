import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  documentId: string;
  fileName: string;
  classificationStatus?: 'started' | 'error' | 'rate_limited' | 'no_credits';
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Tipo não aceito: ${file.type}. Use PDF, JPG, PNG ou XML.`;
  }
  if (file.size > MAX_SIZE) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB.`;
  }
  return null;
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      const validationError = validateFile(file);
      if (validationError) throw new Error(validationError);

      const cid = companyId ?? 'default';
      const timestamp = Date.now();
      const storagePath = `${cid}/${timestamp}_${file.name}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, file, { contentType: file.type });

      if (storageError) throw new Error(`Upload falhou: ${storageError.message}`);

      // Insert document record
      const { data, error } = await supabase
        .from('documentos' as never)
        .insert({
          company_id: cid,
          nome_arquivo: file.name,
          storage_path: storagePath,
          tipo_mime: file.type,
          tamanho_bytes: file.size,
          enviado_por: user?.id ?? null,
          status: 'recebido',
        } as never)
        .select('id' as never)
        .single() as unknown as { data: { id: string } | null; error: Error | null };

      if (error) throw new Error(`Erro ao registrar documento: ${error.message}`);

      const documentId = data!.id;

      // Trigger AI classification (fire-and-forget with status tracking)
      let classificationStatus: UploadResult['classificationStatus'] = 'started';
      try {
        const { error: fnError } = await supabase.functions.invoke('classify-document', {
          body: { documento_id: documentId },
        });
        if (fnError) {
          console.error('Classification invoke error:', fnError);
          const msg = fnError.message || '';
          if (msg.includes('429')) classificationStatus = 'rate_limited';
          else if (msg.includes('402')) classificationStatus = 'no_credits';
          else classificationStatus = 'error';
        }
      } catch (e) {
        console.error('Classification error:', e);
        classificationStatus = 'error';
      }

      return { documentId, fileName: file.name, classificationStatus };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['audit-queue'] });
      qc.invalidateQueries({ queryKey: ['audit-stats'] });
      qc.invalidateQueries({ queryKey: ['sidebar-badge-audit'] });
    },
  });
}
