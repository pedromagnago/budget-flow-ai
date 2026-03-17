import { formatCurrency } from '@/lib/formatters';

interface GoldenRuleBarProps {
  orcado: number;
  consumido: number;
  saldo: number;
}

export function GoldenRuleBar({ orcado, consumido, saldo }: GoldenRuleBarProps) {
  const pctConsumed = orcado > 0 ? (consumido / orcado) * 100 : 0;

  return (
    <div className="golden-rule-bar">
      <div className="golden-rule-cell">
        <p className="golden-rule-label text-orcado">Total Orçado</p>
        <p className="golden-rule-value">{formatCurrency(orcado)}</p>
      </div>
      <div className="golden-rule-cell">
        <p className="golden-rule-label text-consumido">Consumido (Real)</p>
        <p className="golden-rule-value text-consumido">{formatCurrency(consumido)}</p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-consumido transition-all duration-500"
            style={{ width: `${Math.min(pctConsumed, 100)}%` }}
          />
        </div>
      </div>
      <div className="golden-rule-cell">
        <p className="golden-rule-label text-saldo">Saldo (Previsão)</p>
        <p className="golden-rule-value text-saldo">{formatCurrency(saldo)}</p>
      </div>
    </div>
  );
}
