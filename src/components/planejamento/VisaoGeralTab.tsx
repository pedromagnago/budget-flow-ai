import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useCronogramaServicos, useMedicoes, useMedicoesMetas, useAvancoFisico } from '@/hooks/useSchedule';
import { useServicosSituacao } from '@/hooks/usePlanejamento';
import { formatCurrency } from '@/lib/formatters';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

export function VisaoGeralTab() {
  const { data: servicos } = useCronogramaServicos();
  const { data: medicoes } = useMedicoes();
  const { data: metas } = useMedicoesMetas();
  const { data: avancos } = useAvancoFisico();
  const { data: servicosSituacao } = useServicosSituacao();

  const { avancoGeral, metaGeral } = useMemo(() => {
    if (!servicos?.length || !avancos?.length) return { avancoGeral: 0, metaGeral: 0 };
    const totalValor = servicos.reduce((s, sv) => s + sv.valor_total, 0);
    if (totalValor === 0) return { avancoGeral: 0, metaGeral: 0 };

    const avancoMap: Record<string, number> = {};
    avancos.forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!avancoMap[a.servico_id] || pct > avancoMap[a.servico_id]) avancoMap[a.servico_id] = pct;
    });

    let weightedReal = 0;
    servicos.forEach(sv => {
      weightedReal += ((avancoMap[sv.id] ?? 0) / 100) * sv.valor_total;
    });
    const avancoGeral = (weightedReal / totalValor) * 100;

    const metaMap: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      metaMap[m.servico_id] = (metaMap[m.servico_id] ?? 0) + m.meta_percentual;
    });
    let weightedMeta = 0;
    servicos.forEach(sv => {
      weightedMeta += ((metaMap[sv.id] ?? 0) / 100) * sv.valor_total;
    });
    const metaGeral = (weightedMeta / totalValor) * 100;

    return { avancoGeral, metaGeral };
  }, [servicos, avancos, metas]);

  const currentMedicao = useMemo(() => {
    return (medicoes ?? []).find(m => m.status === 'em_andamento') ?? (medicoes ?? [])[0];
  }, [medicoes]);

  const receitaPrevista = (medicoes ?? []).reduce((s, m) => s + m.valor_planejado, 0);
  const receitaRecebida = (medicoes ?? []).reduce((s, m) => s + m.valor_liberado, 0);
  const custoTotal = (servicos ?? []).reduce((s, sv) => s + sv.valor_total, 0);

  const curvaData = useMemo(() => {
    if (!medicoes?.length || !servicos?.length) return [];
    const totalValor = servicos.reduce((s, sv) => s + sv.valor_total, 0);
    const metaMap: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      metaMap[`${m.servico_id}_${m.medicao_numero}`] = m.meta_percentual;
    });
    const avancoMap: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!avancoMap[a.servico_id] || pct > avancoMap[a.servico_id]) avancoMap[a.servico_id] = pct;
    });

    let acumPlan = 0;
    let acumReal = 0;

    return medicoes.map(m => {
      let planPeriod = 0;
      let realPeriod = 0;
      servicos.forEach(sv => {
        const meta = metaMap[`${sv.id}_${m.numero}`] ?? 0;
        planPeriod += (meta / 100) * sv.valor_total;
        const totalMeta = Array.from({ length: m.numero }, (_, i) =>
          metaMap[`${sv.id}_${i + 1}`] ?? 0
        ).reduce((a, b) => a + b, 0);
        const real = Math.min(avancoMap[sv.id] ?? 0, totalMeta);
        const prevMeta = Array.from({ length: m.numero - 1 }, (_, i) =>
          metaMap[`${sv.id}_${i + 1}`] ?? 0
        ).reduce((a, b) => a + b, 0);
        const realThisPeriod = Math.max(0, real - prevMeta);
        realPeriod += (realThisPeriod / 100) * sv.valor_total;
      });

      acumPlan += totalValor > 0 ? (planPeriod / totalValor) * 100 : 0;
      acumReal += totalValor > 0 ? (realPeriod / totalValor) * 100 : 0;

      return {
        name: `M${m.numero}`,
        planejado: Math.round(acumPlan * 10) / 10,
        real: Math.round(acumReal * 10) / 10,
        valor: m.valor_planejado,
        desvio: Math.round((acumReal - acumPlan) * 10) / 10,
      };
    });
  }, [medicoes, servicos, metas, avancos]);

  const atrasados = (servicosSituacao ?? []).filter(s => s.situacao_calculada === 'atrasado');

  const progressColor = avancoGeral >= metaGeral ? 'bg-consumido' : avancoGeral >= metaGeral * 0.8 ? 'bg-module-dashboard' : 'bg-destructive';

  const diasRestantes = currentMedicao
    ? Math.max(0, Math.ceil((new Date(currentMedicao.data_fim).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Avanço Físico Geral</p>
            <p className="text-2xl font-bold font-mono">{avancoGeral.toFixed(1)}%</p>
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(avancoGeral, 100)}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">Meta: {metaGeral.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Prazo</p>
            <p className="text-lg font-semibold">
              M{currentMedicao?.numero ?? '—'} em andamento
            </p>
            <Badge variant="outline" className="text-xs">{diasRestantes} dias restantes</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Receita Prevista vs Recebida</p>
            <p className="text-sm font-mono">
              <span className="text-consumido">{formatCurrency(receitaRecebida)}</span>
              <span className="text-muted-foreground"> / {formatCurrency(receitaPrevista)}</span>
            </p>
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-consumido transition-all" style={{ width: `${receitaPrevista > 0 ? Math.min((receitaRecebida / receitaPrevista) * 100, 100) : 0}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Custo Planejado Total</p>
            <p className="text-sm font-mono">{formatCurrency(custoTotal)}</p>
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Curva S */}
      {curvaData.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium mb-4">Curva S — Planejado vs Real</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curvaData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="pct" domain={[0, 100]} unit="%" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis yAxisId="val" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'valor') return [formatCurrency(value), 'Valor'];
                      if (name === 'desvio') return [`${value}%`, 'Desvio'];
                      return [`${value}%`, name === 'planejado' ? 'Planejado' : 'Real'];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="val" dataKey="valor" fill="hsl(var(--primary) / 0.2)" name="valor" radius={[4, 4, 0, 0]} />
                  <Area yAxisId="pct" dataKey="planejado" fill="hsl(var(--destructive) / 0.08)" stroke="none" name=" " />
                  <Line yAxisId="pct" dataKey="planejado" stroke="hsl(var(--module-simulator))" strokeWidth={2} dot={{ r: 3 }} name="planejado" />
                  <Line yAxisId="pct" dataKey="real" stroke="hsl(var(--consumido))" strokeWidth={2} dot={{ r: 3 }} name="real" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {atrasados.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">Serviços Atrasados</p>
              <Badge variant="destructive" className="ml-auto text-[10px]">{atrasados.length}</Badge>
            </div>
            <div className="space-y-2">
              {atrasados.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-destructive/5 rounded-lg px-3 py-2">
                  <span className="font-medium text-xs">{s.nome}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-[10px]">{s.dias_atraso}d atraso</Badge>
                    <span className="text-xs font-mono text-destructive">{formatCurrency(s.valor_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
