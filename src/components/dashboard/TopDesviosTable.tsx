import { formatPercent } from '@/lib/formatters';

interface DesvioGroup {
  grupo: string;
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
            <th className="text-left py-1.5 px-2">Grupo</th>
            <th className="text-right py-1.5 px-2">% Exec.</th>
          </tr>
        </thead>
        <tbody>
          {data.map(g => (
            <tr key={g.grupo} className="border-t">
              <td className="py-1.5 px-2 text-xs">{g.grupo.substring(0, 25)}</td>
              <td className={`py-1.5 px-2 text-right font-mono text-xs ${g.pct_consumido > 1 ? 'text-destructive font-bold' : g.pct_consumido > 0.8 ? 'text-module-dashboard' : ''}`}>
                {formatPercent(g.pct_consumido)}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={2} className="py-4 text-center text-xs text-muted-foreground">Sem dados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
