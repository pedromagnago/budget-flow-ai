import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardHat, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCronogramaServicos, useMedicoes, useMedicoesMetas, useAvancoFisico } from '@/hooks/useSchedule';
import { useServicosSituacao } from '@/hooks/usePlanejamento';
import { formatCurrency } from '@/lib/formatters';
import { Link } from 'react-router-dom';

export function ObraMiniCard() {
  const { data: servicos } = useCronogramaServicos();
  const { data: medicoes } = useMedicoes();
  const { data: metas } = useMedicoesMetas();
  const { data: avancos } = useAvancoFisico();
  const { data: servicosSituacao } = useServicosSituacao();

  const { avancoGeral, metaGeral } = useMemo(() => {
    if (!servicos?.length) return { avancoGeral: 0, metaGeral: 0 };
    const totalValor = servicos.reduce((s, sv) => s + sv.valor_total, 0);
    if (totalValor === 0) return { avancoGeral: 0, metaGeral: 0 };

    const avancoMap: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!avancoMap[a.servico_id] || pct > avancoMap[a.servico_id]) avancoMap[a.servico_id] = pct;
    });

    let weightedReal = 0;
    servicos.forEach(sv => { weightedReal += ((avancoMap[sv.id] ?? 0) / 100) * sv.valor_total; });

    const metaMap: Record<string, number> = {};
    (metas ?? []).forEach(m => { metaMap[m.servico_id] = (metaMap[m.servico_id] ?? 0) + m.meta_percentual; });
    let weightedMeta = 0;
    servicos.forEach(sv => { weightedMeta += ((metaMap[sv.id] ?? 0) / 100) * sv.valor_total; });

    return { avancoGeral: (weightedReal / totalValor) * 100, metaGeral: (weightedMeta / totalValor) * 100 };
  }, [servicos, avancos, metas]);

  const currentMedicao = useMemo(() => {
    return (medicoes ?? []).find(m => m.status === 'em_andamento') ?? (medicoes ?? [])[0];
  }, [medicoes]);

  const atrasados = (servicosSituacao ?? []).filter(s => s.situacao_calculada === 'atrasado');
  const diasRestantes = currentMedicao
    ? Math.max(0, Math.ceil((new Date(currentMedicao.data_fim).getTime() - Date.now()) / 86400000))
    : 0;

  const nextLib = (medicoes ?? []).find(m => m.status === 'futura' || m.status === 'em_andamento');
  const progressColor = avancoGeral >= metaGeral ? 'bg-consumido' : avancoGeral >= metaGeral * 0.8 ? 'bg-module-dashboard' : 'bg-destructive';

  if (!servicos?.length) return null;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Obra</p>
          </div>
          <Link to="/planejamento" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
            Ver planejamento <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-mono font-bold">{avancoGeral.toFixed(1)}%</span>
            <span className="text-muted-foreground">meta: {metaGeral.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(avancoGeral, 100)}%` }} />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs">
          {currentMedicao && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medição atual</span>
              <span className="font-mono">M{currentMedicao.numero} · {diasRestantes}d restantes</span>
            </div>
          )}

          {atrasados.length > 0 && (
            <Link to="/planejamento?filtro=atrasado" className="flex justify-between items-center hover:bg-muted/50 rounded px-1 -mx-1 py-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Em risco
              </span>
              <Badge variant="destructive" className="text-[10px]">{atrasados.length}</Badge>
            </Link>
          )}

          {nextLib && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Próxima liberação</span>
              <span className="font-mono">{formatCurrency(nextLib.valor_planejado)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
