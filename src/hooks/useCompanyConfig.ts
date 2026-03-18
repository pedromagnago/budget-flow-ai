import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { STALE_TIMES } from '@/lib/constants';

interface CompanyConfig {
  quinzena_atual: string;
  limiar_desvio_alerta: number;
  score_minimo_auto_approve: number;
  dias_sync_omie: number;
}

interface CompanyInfo {
  razao_social: string;
  nome_fantasia: string | null;
  municipio: string | null;
  estado: string | null;
  qtd_casas: number | null;
  status: string | null;
  config: CompanyConfig;
}

const DEFAULT_CONFIG: CompanyConfig = {
  quinzena_atual: 'Q1',
  limiar_desvio_alerta: 0.10,
  score_minimo_auto_approve: 0.95,
  dias_sync_omie: 1,
};

export function useCompanyConfig() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['company-config', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.configs,
    queryFn: async (): Promise<CompanyInfo> => {
      const { data, error } = await supabase
        .from('companies')
        .select('razao_social, nome_fantasia, municipio, estado, qtd_casas, status, config')
        .eq('id', companyId!)
        .single();
      if (error || !data) {
        return {
          razao_social: 'Empresa',
          nome_fantasia: null,
          municipio: null,
          estado: null,
          qtd_casas: null,
          status: null,
          config: DEFAULT_CONFIG,
        };
      }
      return {
        ...data,
        config: { ...DEFAULT_CONFIG, ...(data.config as Record<string, unknown>) } as CompanyConfig,
      };
    },
  });
}
