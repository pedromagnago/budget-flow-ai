import { useMemo } from 'react';
import { useEtapasCompletas } from '@/hooks/useEtapas';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';

export function OrcadoRealizadoFisicoTab() {
  const { data: etapas, isLoading } = useEtapasCompletas();

  const chartData = useMemo(() => {
    if (!etapas?.length) return [];
    return etapas.map(e => ({
      nome: e.etapa_nome.length > 18 ? e.etapa_nome.slice(0, 16) + '…' : e.etapa_nome,
      orcado: e.etapa_valor_orcado,
      consumido: e.soma_consumido_itens,
      pago: e.valor_pago_lancamentos,
      pctFisico: e.pct_fisico_concluido,
      pctConsumo: e.pct_consumido,
    }));
  }, [etapas]);

  const totals = useMemo(() => {
    if (!etapas?.length) return { orcado: 0, consumido: 0, pago: 0 };
    return {
      orcado: etapas.reduce((s, e) => s + e.etapa_valor_orcado, 0),
      consumido: etapas.reduce((s, e) => s + e.soma_consumido_itens, 0),
      pago: etapas.reduce((s, e) => s + e.valor_pago_lancamentos, 0),
    };
  }, [etapas]);

  if (isLoading) return <SkeletonTable rows={8} cols={8} />;

  return (
    <div className="space-y-6">
      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold mb-4">Orçado × Consumido × Pago — por Etapa</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="orcado" name="Orçado" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumido" name="Consumido" fill="hsl(var(--module-dashboard))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pago" name="Pago" fill="hsl(var(--consumido))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2.5 px-4 font-medium text-xs">Etapa</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs">Orçado</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs">Consumido</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs">% Consumo</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs">Pago</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs">% Físico</th>
              <th className="text-center py-2.5 px-4 font-medium text-xs">Desvio</th>
            </tr>
          </thead>
          <tbody>
            {(etapas ?? []).map(e => {
              const desvio = e.pct_consumido - e.pct_fisico_concluido;
              const desvioLabel = desvio > 20 ? 'Acima' : desvio < -20 ? 'Abaixo' : 'Normal';
              const desvioColor = desvio > 20 ? 'destructive' : desvio < -20 ? 'default' : 'secondary';

              return (
                <tr key={e.grupo_id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-4 text-xs font-medium">{e.etapa_nome}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(e.etapa_valor_orcado)}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(e.soma_consumido_itens)}</td>
                  <td className={cn('py-2 px-4 text-right font-mono text-xs', e.pct_consumido > 100 && 'text-destructive font-bold')}>
                    {e.pct_consumido}%
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-consumido">{formatCurrency(e.valor_pago_lancamentos)}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{e.pct_fisico_concluido}%</td>
                  <td className="py-2 px-4 text-center">
                    <Badge variant={desvioColor as 'default'} className="text-[10px]">{desvioLabel}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-bold">
              <td className="py-2 px-4 text-xs">TOTAL</td>
              <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(totals.orcado)}</td>
              <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(totals.consumido)}</td>
              <td className="py-2 px-4 text-right font-mono text-xs">{totals.orcado > 0 ? formatPercent(totals.consumido / totals.orcado) : '0%'}</td>
              <td className="py-2 px-4 text-right font-mono text-xs text-consumido">{formatCurrency(totals.pago)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
