import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/constants';

interface Documento {
  id: string;
  nome_arquivo: string;
  status: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  created_at: string;
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
