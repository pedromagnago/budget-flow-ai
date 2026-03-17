import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  documentId: string;
  fileName: string;
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

      return { documentId: data!.id, fileName: file.name };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
