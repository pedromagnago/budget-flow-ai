import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/constants';

interface Medicao {
  id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_planejado: number;
  status: string;
  valor_liberado: number;
}

export function useMedicoes() {
  return useQuery({
    queryKey: ['medicoes'],
    queryFn: async (): Promise<Medicao[]> => {
      const { data, error } = await supabase
        .from('medicoes' as never)
        .select('*' as never)
        .order('numero' as never, { ascending: true } as never) as unknown as { data: Medicao[] | null; error: Error | null };
      
      if (error) throw error;
      return (data ?? []).map(m => ({ ...m, valor_planejado: Number(m.valor_planejado), valor_liberado: Number(m.valor_liberado) }));
    },
    staleTime: STALE_TIMES.dashboard,
  });
}

interface CronogramaServico {
  id: string;
  nome: string;
  valor_total: number;
}

export function useCronogramaServicos() {
  return useQuery({
    queryKey: ['cronograma-servicos'],
    queryFn: async (): Promise<CronogramaServico[]> => {
      const { data, error } = await supabase
        .from('cronograma_servicos' as never)
        .select('*' as never) as unknown as { data: CronogramaServico[] | null; error: Error | null };
      
      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIMES.configs,
  });
}
