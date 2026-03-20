import { useMemo } from 'react';
import { useEtapasCompletas } from '@/hooks/useEtapas';
import { useMedicoesFinanceiro } from '@/hooks/usePlanejamento';
import { formatCurrency } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';

/**
 * EVM — Earned Value Management
 * ────────────────────────────────
 * PV  = Planned Value (orçamento previsto acumulado)
 * EV  = Earned Value (valor do trabalho realmente executado = orcado × % físico)
 * AC  = Actual Cost (custo real = consumido)
 * CPI = EV / AC  (> 1 = bom, < 1 = estouro)
 * SPI = EV / PV  (> 1 = adiantado, < 1 = atrasado)
 * EAC = BAC / CPI (Estimativa no Conclusão)
 * BAC = Budget at Completion (orçamento total)
 */

export function DesempenhoEvmTab() {
  const { data: etapas, isLoading: loadingEtapas } = useEtapasCompletas();
  const { data: medicoes, isLoading: loadingMed } = useMedicoesFinanceiro();

  const evm = useMemo(() => {
    if (!etapas?.length) return null;
    const BAC = etapas.reduce((s, e) => s + e.etapa_valor_orcado, 0);
    const AC = etapas.reduce((s, e) => s + e.soma_consumido_itens, 0);

    // EV = sum of (orcado_etapa × pct_fisico_concluido / 100)
    const EV = etapas.reduce((s, e) => s + (e.etapa_valor_orcado * e.pct_fisico_concluido / 100), 0);

    // PV approximation: we use the sum of consumido targets based on elapsed medições
    // For simplicity: PV ≈ BAC × (current_medicao / total_medicoes)
    const totalMed = medicoes?.length ?? 1;
    const currentMedIdx = (medicoes ?? []).findIndex(m => m.status !== 'liberada');
    const elapsedRatio = totalMed > 0 ? Math.max(1, currentMedIdx >= 0 ? currentMedIdx : totalMed) / totalMed : 1;
    const PV = BAC * elapsedRatio;

    const CPI = AC > 0 ? EV / AC : 0;
    const SPI = PV > 0 ? EV / PV : 0;
    const EAC = CPI > 0 ? BAC / CPI : BAC;
    const ETC = EAC - AC;
    const VAC = BAC - EAC;

    return { BAC, PV, EV, AC, CPI, SPI, EAC, ETC, VAC };
  }, [etapas, medicoes]);

  const curvaEvmData = useMemo(() => {
    if (!medicoes?.length || !etapas?.length) return [];

    const BAC = etapas.reduce((s, e) => s + e.etapa_valor_orcado, 0);
    const totalMed = medicoes.length;

    let acumPV = 0;
    return medicoes.map((m, i) => {
      const pvIncrement = BAC / totalMed;
      acumPV += pvIncrement;

      return {
        name: `M${m.numero}`,
        PV: Math.round(acumPV),
        EV: 0, // would need per-period physical data
        AC: 0, // would need per-period cost data
        valorPlanejado: m.valor_planejado,
        valorLiberado: m.valor_liberado,
      };
    });
  }, [medicoes, etapas]);

  const isLoading = loadingEtapas || loadingMed;
  if (isLoading) return <SkeletonTable rows={5} cols={4} />;
  if (!evm) return <p className="text-sm text-muted-foreground p-4">Sem dados suficientes para análise EVM.</p>;

  const cpiColor = evm.CPI >= 1 ? 'text-consumido' : evm.CPI >= 0.9 ? 'text-yellow-600' : 'text-destructive';
  const spiColor = evm.SPI >= 1 ? 'text-consumido' : evm.SPI >= 0.9 ? 'text-yellow-600' : 'text-destructive';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { label: 'BAC', sublabel: 'Orçamento Total', value: formatCurrency(evm.BAC), color: '' },
          { label: 'PV', sublabel: 'Valor Planejado', value: formatCurrency(evm.PV), color: '' },
          { label: 'EV', sublabel: 'Valor Agregado', value: formatCurrency(evm.EV), color: '' },
          { label: 'AC', sublabel: 'Custo Real', value: formatCurrency(evm.AC), color: '' },
          { label: 'CPI', sublabel: 'Índice Custo', value: evm.CPI.toFixed(2), color: cpiColor },
          { label: 'SPI', sublabel: 'Índice Prazo', value: evm.SPI.toFixed(2), color: spiColor },
          { label: 'EAC', sublabel: 'Estimativa Final', value: formatCurrency(evm.EAC), color: evm.EAC > evm.BAC * 1.05 ? 'text-destructive' : '' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{kpi.label}</p>
              <p className={cn('text-lg font-bold font-mono mt-0.5', kpi.color)}>{kpi.value}</p>
              <p className="text-[9px] text-muted-foreground">{kpi.sublabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interpretation */}
      <Card className={cn(
        'border-l-4',
        evm.CPI >= 1 && evm.SPI >= 1 ? 'border-l-consumido bg-consumido/5'
        : evm.CPI >= 0.9 && evm.SPI >= 0.9 ? 'border-l-yellow-500 bg-yellow-500/5'
        : 'border-l-destructive bg-destructive/5'
      )}>
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-medium mb-2">Diagnóstico do Projeto</p>
          <div className="space-y-1.5 text-xs">
            {evm.CPI >= 1 ? (
              <p className="text-consumido">✅ <strong>Custo sob controle</strong> — CPI de {evm.CPI.toFixed(2)} indica que o projeto está gastando dentro do previsto.</p>
            ) : (
              <p className="text-destructive">⚠️ <strong>Estouro de custo</strong> — CPI de {evm.CPI.toFixed(2)} indica que está custando mais do que o planejado para o trabalho executado.
                Estimativa final: {formatCurrency(evm.EAC)} (desvio de {formatCurrency(evm.EAC - evm.BAC)}).</p>
            )}
            {evm.SPI >= 1 ? (
              <p className="text-consumido">✅ <strong>Prazo em dia</strong> — SPI de {evm.SPI.toFixed(2)} indica que o trabalho está sendo entregue no ritmo planejado ou mais rápido.</p>
            ) : (
              <p className="text-destructive">⚠️ <strong>Atraso no cronograma</strong> — SPI de {evm.SPI.toFixed(2)} indica que o trabalho executado está abaixo do planejado para este ponto.</p>
            )}
            <div className="flex gap-4 mt-2">
              <div>
                <span className="text-muted-foreground">Custo restante estimado:</span>
                <span className="font-mono font-medium ml-1">{formatCurrency(Math.max(0, evm.ETC))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Variação no final:</span>
                <span className={cn('font-mono font-medium ml-1', evm.VAC < 0 ? 'text-destructive' : 'text-consumido')}>
                  {evm.VAC >= 0 ? '+' : ''}{formatCurrency(evm.VAC)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-etapa EVM table */}
      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">EVM por Etapa</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-4 text-xs font-medium">Etapa</th>
              <th className="text-right py-2 px-4 text-xs font-medium">Orçado (BAC)</th>
              <th className="text-right py-2 px-4 text-xs font-medium">Valor Agregado (EV)</th>
              <th className="text-right py-2 px-4 text-xs font-medium">Custo Real (AC)</th>
              <th className="text-right py-2 px-4 text-xs font-medium">CPI</th>
              <th className="text-right py-2 px-4 text-xs font-medium">% Físico</th>
              <th className="text-right py-2 px-4 text-xs font-medium">% Consumo</th>
            </tr>
          </thead>
          <tbody>
            {(etapas ?? []).map(e => {
              const ev = e.etapa_valor_orcado * e.pct_fisico_concluido / 100;
              const ac = e.soma_consumido_itens;
              const cpi = ac > 0 ? ev / ac : 0;

              return (
                <tr key={e.grupo_id} className="border-t hover:bg-muted/20">
                  <td className="py-2 px-4 text-xs font-medium">{e.etapa_nome}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(e.etapa_valor_orcado)}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(ev)}</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(ac)}</td>
                  <td className={cn('py-2 px-4 text-right font-mono text-xs font-bold', cpi >= 1 ? 'text-consumido' : cpi >= 0.9 ? 'text-yellow-600' : 'text-destructive')}>
                    {ac > 0 ? cpi.toFixed(2) : '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{e.pct_fisico_concluido}%</td>
                  <td className={cn('py-2 px-4 text-right font-mono text-xs', e.pct_consumido > 100 && 'text-destructive font-bold')}>
                    {e.pct_consumido}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
