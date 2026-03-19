import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface DesvioGroup {
  grupo: string;
  valor_orcado: number;
  valor_consumido: number;
  pct_consumido: number;
}

interface Props {
  data: DesvioGroup[];
}

export function TopDesviosTable({ data }: Props) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
        Top 5 Desvios
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left py-1.5 px-2 text-xs">Grupo</th>
            <th className="text-right py-1.5 px-2 text-xs">Orçado</th>
            <th className="text-right py-1.5 px-2 text-xs">Realizado</th>
            <th className="text-right py-1.5 px-2 text-xs">% Exec.</th>
          </tr>
        </thead>
        <tbody>
          {data.map(g => {
            const isOver = g.pct_consumido > 1;
            const isLow = g.pct_consumido < 0.5 && g.valor_consumido > 0;
            return (
              <tr key={g.grupo} className={cn('border-t', isOver && 'bg-destructive/5')}>
                <td className="py-1.5 px-2 text-xs">{g.grupo.substring(0, 25)}</td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">{formatCurrency(g.valor_orcado)}</td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">{formatCurrency(g.valor_consumido)}</td>
                <td className={cn(
                  'py-1.5 px-2 text-right font-mono text-xs font-bold',
                  isOver ? 'text-destructive' : isLow ? 'text-yellow-600' : ''
                )}>
                  {formatPercent(g.pct_consumido)}
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">Sem dados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
