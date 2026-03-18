import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { DocumentUploadZone } from '@/components/client/DocumentUploadZone';
import { DocumentHistory } from '@/components/client/DocumentHistory';
import { BudgetByGroupTable } from '@/components/client/BudgetByGroupTable';
import { useBudgetSummary } from '@/hooks/useBudget';

export default function ClientPortal() {
  const { data: groups } = useBudgetSummary();

  const totalOrcado = (groups ?? []).reduce((s, g) => s + g.valor_orcado, 0);
  const totalConsumido = (groups ?? []).reduce((s, g) => s + g.valor_consumido, 0);
  const totalSaldo = totalOrcado - totalConsumido;

  return (
    <div className="space-y-6">
      <GoldenRuleBar orcado={totalOrcado} consumido={totalConsumido} saldo={totalSaldo} />

      <DocumentUploadZone />

      <DocumentHistory />

      <BudgetByGroupTable />
    </div>
  );
}
