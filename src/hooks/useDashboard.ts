import { useBudgetSummary } from '@/hooks/useBudget';
import { useAuditStats } from '@/hooks/useAuditQueue';
import { useMedicoes } from '@/hooks/useSchedule';
import { useDocuments } from '@/hooks/useDocuments';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';

export function useDashboard() {
  const { data: budgetGroups, isLoading: loadingBudget } = useBudgetSummary();
  const { data: auditStats } = useAuditStats();
  const { data: medicoes } = useMedicoes();
  const { data: documents } = useDocuments();
  const { data: company } = useCompanyConfig();

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

  // Top 5 deviations (highest pct_consumido first)
  const topDesvios = (budgetGroups ?? [])
    .filter(g => g.grupo !== 'RECEITAS')
    .sort((a, b) => b.pct_consumido - a.pct_consumido)
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

  return {
    totalOrcado,
    totalConsumido,
    totalSaldo,
    pctExecucao,
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
