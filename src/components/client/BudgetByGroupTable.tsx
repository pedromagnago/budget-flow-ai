import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useBudgetSummary } from '@/hooks/useBudget';
import { SkeletonTable } from '@/components/shared/SkeletonTable';

export function BudgetByGroupTable() {
  const { data: groups, isLoading } = useBudgetSummary();

  const filtered = (groups ?? []).filter(g => g.grupo !== 'RECEITAS');
  const totalOrcado = filtered.reduce((s, g) => s + g.valor_orcado, 0);
  const totalConsumido = filtered.reduce((s, g) => s + g.valor_consumido, 0);
  const totalSaldo = totalOrcado - totalConsumido;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Orçamento por Grupo
      </p>
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={6} cols={6} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-2 px-3">Grupo</th>
                <th className="text-right py-2 px-3">Orçado</th>
                <th className="text-right py-2 px-3">Consumido</th>
                <th className="text-right py-2 px-3">Saldo</th>
                <th className="text-right py-2 px-3">%</th>
                <th className="py-2 px-3 w-32">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => {
                const pct = g.valor_orcado > 0 ? g.valor_consumido / g.valor_orcado : 0;
                return (
                  <tr key={g.grupo_id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium">{g.grupo}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(g.valor_orcado)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-consumido">{formatCurrency(g.valor_consumido)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-saldo">{formatCurrency(g.valor_saldo)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatPercent(pct)}</td>
                    <td className="py-2 px-3">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 1 ? 'bg-destructive' : 'bg-consumido'}`}
                          style={{ width: `${Math.min(pct * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(totalOrcado)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-consumido">{formatCurrency(totalConsumido)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-saldo">{formatCurrency(totalSaldo)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">
                  {totalOrcado > 0 ? formatPercent(totalConsumido / totalOrcado) : '0%'}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
