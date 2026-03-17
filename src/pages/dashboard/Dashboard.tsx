import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { SCurveChart } from '@/components/dashboard/SCurveChart';
import { TopDesviosTable } from '@/components/dashboard/TopDesviosTable';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { AuditMiniCard } from '@/components/dashboard/AuditMiniCard';
import { LatestDocsWidget } from '@/components/dashboard/LatestDocsWidget';
import { useDashboard } from '@/hooks/useDashboard';

export default function Dashboard() {
  const {
    totalOrcado, totalConsumido, totalSaldo, pctExecucao,
    chartGroups, topDesvios, curvaData, fluxoData,
    medicoes, auditStats, latestDocs, loadingBudget,
  } = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">
          Status do Projeto: 64 Casas — Quinzena 01
        </h1>
        <p className="text-sm text-muted-foreground mt-1">São Francisco de Paula/RS — Início: 09/03/2026</p>
      </div>

      <GoldenRuleBar orcado={totalOrcado} consumido={totalConsumido} saldo={totalSaldo} />

      <SummaryCards
        totalOrcado={totalOrcado}
        totalConsumido={totalConsumido}
        totalSaldo={totalSaldo}
        pctExecucao={pctExecucao}
        loading={loadingBudget}
      />

      <div className="grid grid-cols-2 gap-4">
        <BudgetVsActualChart data={chartGroups} loading={loadingBudget} />
        <SCurveChart data={curvaData} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TopDesviosTable data={topDesvios} />
        <CashFlowChart data={fluxoData} />
        <AuditMiniCard auditStats={auditStats} medicoes={medicoes} />
      </div>

      <div className="grid grid-cols-1">
        <LatestDocsWidget documents={latestDocs} />
      </div>
    </div>
  );
}
