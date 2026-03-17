import { DollarSign, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryCardsProps {
  totalOrcado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctExecucao: number;
  loading?: boolean;
}

const CARDS = [
  { key: 'orcado', label: 'Total Orçado', icon: DollarSign, accent: 'text-orcado', isPercent: false },
  { key: 'consumido', label: 'Consumido (Real)', icon: TrendingUp, accent: 'text-consumido', isPercent: false },
  { key: 'saldo', label: 'Saldo Futuro', icon: BarChart3, accent: 'text-saldo', isPercent: false },
  { key: 'pct', label: '% Execução', icon: AlertTriangle, accent: 'text-module-dashboard', isPercent: true },
] as const;

export function SummaryCards({ totalOrcado, totalConsumido, totalSaldo, pctExecucao, loading }: SummaryCardsProps) {
  const values: Record<string, number> = { orcado: totalOrcado, consumido: totalConsumido, saldo: totalSaldo, pct: pctExecucao };

  return (
    <div className="grid grid-cols-4 gap-4">
      {CARDS.map(card => (
        <div key={card.key} className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <card.icon className={`h-4 w-4 ${card.accent}`} />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{card.label}</p>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className={`font-mono text-2xl font-bold tabular-nums ${card.accent}`}>
              {card.isPercent ? formatPercent(values[card.key]) : formatCurrency(values[card.key])}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
