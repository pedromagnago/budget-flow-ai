import { useState } from 'react';
import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { SCurveChart } from '@/components/dashboard/SCurveChart';
import { TopDesviosTable } from '@/components/dashboard/TopDesviosTable';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { AuditMiniCard } from '@/components/dashboard/AuditMiniCard';
import { LatestDocsWidget } from '@/components/dashboard/LatestDocsWidget';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDashboard } from '@/hooks/useDashboard';
import { FileUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const {
    totalOrcado, totalConsumido, totalSaldo, pctExecucao,
    totalReceita, margemBruta,
    chartGroups, topDesvios, curvaData, fluxoData,
    medicoes, auditStats, latestDocs, loadingBudget,
    hasData, quinzena, companyName, municipio, estado, qtdCasas,
  } = useDashboard();

  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const activeQ = selectedQ ?? quinzena;

  // Filter S-Curve and Cash Flow data up to selected quinzena
  const qNum = parseInt(activeQ.replace(/\D/g, ''), 10) || 10;
  const filteredCurva = curvaData.slice(0, qNum);
  const filteredFluxo = fluxoData.slice(0, qNum);

  // Available quinzenas from medicoes
  const availableQs = medicoes.length > 0
    ? medicoes.map((_, i) => `Q${i + 1}`)
    : Array.from({ length: 10 }, (_, i) => `Q${i + 1}`);

  if (!loadingBudget && !hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do projeto</p>
        </div>
        <EmptyState
          icon={FileUp}
          title="Nenhum orçamento importado"
          description="Para visualizar indicadores, importe seu orçamento primeiro. O Dashboard será preenchido automaticamente."
          actionLabel="Importar Orçamento"
          actionHref="/import"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter">
            Status do Projeto: {qtdCasas} Casas — {activeQ}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {municipio && estado ? `${municipio}/${estado}` : companyName}
          </p>
        </div>
        <Select value={activeQ} onValueChange={setSelectedQ}>
          <SelectTrigger className="w-[100px] h-9 text-xs">
            <SelectValue placeholder="Quinzena" />
          </SelectTrigger>
          <SelectContent>
            {availableQs.map(q => (
              <SelectItem key={q} value={q}>{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <GoldenRuleBar orcado={totalOrcado} consumido={totalConsumido} saldo={totalSaldo} />

      <SummaryCards
        totalOrcado={totalOrcado}
        totalConsumido={totalConsumido}
        totalSaldo={totalSaldo}
        pctExecucao={pctExecucao}
        totalReceita={totalReceita}
        margemBruta={margemBruta}
        loading={loadingBudget}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BudgetVsActualChart data={chartGroups} loading={loadingBudget} />
        <SCurveChart data={filteredCurva} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopDesviosTable data={topDesvios} />
        <CashFlowChart data={filteredFluxo} />
        <AuditMiniCard auditStats={auditStats} medicoes={medicoes} />
      </div>

      <div className="grid grid-cols-1">
        <LatestDocsWidget documents={latestDocs} />
      </div>
    </div>
  );
}
