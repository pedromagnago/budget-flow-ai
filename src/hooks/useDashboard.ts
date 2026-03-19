import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetSummary } from '@/hooks/useBudget';
import { useAuditStats } from '@/hooks/useAuditQueue';
import { useMedicoes } from '@/hooks/useSchedule';
import { useDocuments } from '@/hooks/useDocuments';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { useCompany } from '@/hooks/useCompany';

export function useDashboard() {
  const { companyId } = useCompany();
  const { data: budgetGroups, isLoading: loadingBudget } = useBudgetSummary();
  const { data: auditStats } = useAuditStats();
  const { data: medicoes } = useMedicoes();
  const { data: documents } = useDocuments();
  const { data: company } = useCompanyConfig();

  // Query receitas previstas
  const { data: receitaTotal } = useQuery({
    queryKey: ['receita-total', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { data, error } = await supabase
        .from('lancamentos')
        .select('valor')
        .eq('company_id', companyId)
        .eq('tipo', 'receita')
        .is('deleted_at', null);
      if (error || !data) return 0;
      return data.reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
    },
    enabled: !!companyId,
  });

  const quinzena = company?.config?.quinzena_atual ?? 'Q1';
  const companyName = company?.nome_fantasia || company?.razao_social || 'Projeto';
  const municipio = company?.municipio;
  const estado = company?.estado;
  const qtdCasas = company?.qtd_casas ?? 64;

  const totalOrcado = budgetGroups?.reduce((s, g) => s + g.valor_orcado, 0) ?? 0;
  const totalConsumido = budgetGroups?.reduce((s, g) => s + g.valor_consumido, 0) ?? 0;
  const totalSaldo = totalOrcado - totalConsumido;
  const pctExecucao = totalOrcado > 0 ? totalConsumido / totalOrcado : 0;
  const hasData = (budgetGroups ?? []).length > 0;

  // Top 15 groups for bar chart (exclude RECEITAS)
  const chartGroups = (budgetGroups ?? [])
    .filter(g => g.grupo !== 'RECEITAS')
    .sort((a, b) => b.valor_orcado - a.valor_orcado)
    .slice(0, 15)
    .map(g => ({
      nome: g.grupo.length > 22 ? g.grupo.substring(0, 20) + '…' : g.grupo,
      orcado: g.valor_orcado,
      consumido: g.valor_consumido,
    }));

  // Top 5 deviations (highest absolute deviation first)
  const topDesvios = (budgetGroups ?? [])
    .filter(g => g.grupo !== 'RECEITAS')
    .map(g => ({
      grupo: g.grupo,
      valor_orcado: g.valor_orcado,
      valor_consumido: g.valor_consumido,
      pct_consumido: g.pct_consumido,
    }))
    .sort((a, b) => Math.abs(b.pct_consumido - 1) - Math.abs(a.pct_consumido - 1))
    .slice(0, 5);

  // S-Curve data
  const curvaData = (medicoes ?? []).map((m, i) => ({
    quinzena: `Q${m.numero}`,
    orcadoAcum: (medicoes ?? []).slice(0, i + 1).reduce((s, x) => s + x.valor_planejado, 0),
    realizadoAcum: (medicoes ?? []).slice(0, i + 1).reduce((s, x) => s + (x.valor_liberado ?? 0), 0),
  }));

  // Cash flow projected
  const fluxoData = (medicoes ?? []).map((m, i) => {
    const acumPlanejado = (medicoes ?? []).slice(0, i + 1).reduce((s, x) => s + x.valor_planejado, 0);
    const acumLiberado = (medicoes ?? []).slice(0, i + 1).reduce((s, x) => s + (x.valor_liberado ?? 0), 0);
    return {
      quinzena: `Q${m.numero}`,
      realizado: acumLiberado,
      projetado: acumPlanejado - acumLiberado,
    };
  });

  // Latest 5 documents
  const latestDocs = (documents ?? []).slice(0, 5);

  const totalReceita = receitaTotal ?? 0;
  const margemBruta = totalReceita - totalOrcado;

  return {
    totalOrcado,
    totalConsumido,
    totalSaldo,
    pctExecucao,
    totalReceita,
    margemBruta,
    chartGroups,
    topDesvios,
    curvaData,
    fluxoData,
    medicoes: medicoes ?? [],
    auditStats,
    latestDocs,
    loadingBudget,
    hasData,
    quinzena,
    companyName,
    municipio,
    estado,
    qtdCasas,
  };
}
