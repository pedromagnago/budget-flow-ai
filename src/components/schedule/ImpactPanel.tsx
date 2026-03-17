import { formatCurrency } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Medicao, CronogramaServico } from '@/hooks/useSchedule';

interface Props {
  medicoes: Medicao[];
  servicos: CronogramaServico[];
  metaMap: Record<string, number>;
  avancoMap: Record<string, number>;
}

function getMedicaoStatus(medicao: Medicao, servicos: CronogramaServico[], metaMap: Record<string, number>, avancoMap: Record<string, number>) {
  // Count services below target for this measurement
  let belowTarget = 0;
  let totalWithMeta = 0;

  servicos.forEach(s => {
    const meta = metaMap[`${s.id}_${medicao.numero}`];
    if (meta !== undefined && meta > 0) {
      totalWithMeta++;
      const real = avancoMap[s.id] ?? 0;
      // Sum all metas up to this measurement
      const totalMetaUpTo = Array.from({ length: medicao.numero }, (_, i) => metaMap[`${s.id}_${i + 1}`] ?? 0).reduce((a, b) => a + b, 0);
      if (real < totalMetaUpTo) belowTarget++;
    }
  });

  const status = medicao.status === 'liberada' ? 'no_prazo'
    : medicao.status === 'em_andamento'
      ? (belowTarget > totalWithMeta * 0.3 ? 'em_risco' : 'no_prazo')
      : belowTarget > 0 && medicao.status !== 'futura' ? 'atrasada'
      : 'futura';

  return { status, belowTarget, totalWithMeta };
}

export function ImpactPanel({ medicoes, servicos, metaMap, avancoMap }: Props) {
  if (medicoes.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Painel de Impacto — Medições
      </p>
      <div className="grid grid-cols-4 gap-3">
        {medicoes.map(m => {
          const { status, belowTarget, totalWithMeta } = getMedicaoStatus(m, servicos, metaMap, avancoMap);
          const receitaEmRisco = belowTarget > 0 ? (belowTarget / Math.max(totalWithMeta, 1)) * m.valor_planejado : 0;

          return (
            <div key={m.id} className="bg-card border rounded-xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold text-sm">M{m.numero}</p>
                <StatusBadge status={status} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Planejado: <span className="font-mono text-foreground">{formatCurrency(m.valor_planejado)}</span></p>
                <p>Liberado: <span className="font-mono text-consumido">{formatCurrency(m.valor_liberado)}</span></p>
                {belowTarget > 0 && (
                  <p className="text-destructive">
                    {belowTarget} serviço{belowTarget > 1 ? 's' : ''} abaixo da meta
                  </p>
                )}
                {receitaEmRisco > 0 && (
                  <p className="text-destructive font-mono text-[10px]">
                    Receita em risco: {formatCurrency(receitaEmRisco)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
