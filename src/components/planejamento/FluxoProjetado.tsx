import { useMemo, useState } from 'react';
import { useEtapasHierarquicas } from '@/hooks/usePlanejamentoHierarquico';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { DollarSign, TrendingUp, CalendarRange, Info } from 'lucide-react';
import type { FluxoProjetadoEntry } from '@/types';
import { cn } from '@/lib/utils';

export function FluxoProjetado() {
  const { data: etapas, isLoading } = useEtapasHierarquicas();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const fluxo = useMemo((): FluxoProjetadoEntry[] => {
    if (!etapas?.length) return [];

    const monthMap = new Map<string, FluxoProjetadoEntry>();

    etapas.forEach(etapa => {
      etapa.servicos.forEach(servico => {
        const dataBase = servico.data_inicio_plan;
        if (!dataBase) return;

        servico.itens.forEach(item => {
          const prazo = item.dias_prazo_pagamento ?? 30;
          const dtExec = new Date(dataBase + 'T00:00:00');
          const dtPgto = new Date(dtExec.getTime() + prazo * 86400000);
          const mes = `${dtPgto.getFullYear()}-${String(dtPgto.getMonth() + 1).padStart(2, '0')}`;
          const valor = item.valor_orcado;

          if (!monthMap.has(mes)) {
            monthMap.set(mes, { mes, valor: 0, itens: [] });
          }
          const entry = monthMap.get(mes)!;
          entry.valor += valor;
          entry.itens.push({
            item: item.item,
            servico: servico.servico_nome,
            etapa: etapa.nome,
            valor,
            fornecedor: item.fornecedor ?? null,
            forma_pagamento: item.forma_pagamento ?? null,
            data_projetada: dtPgto.toISOString().split('T')[0],
          });
        });
      });
    });

    return Array.from(monthMap.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [etapas]);

  const totalFluxo = fluxo.reduce((s, f) => s + f.valor, 0);
  const mesAtual = new Date().toISOString().slice(0, 7);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
  };

  if (isLoading) return <div className="p-4"><SkeletonTable rows={6} cols={3} /></div>;

  if (fluxo.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <CalendarRange className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Sem projeção de fluxo</p>
        <p className="text-xs mt-1">Adicione itens com datas de serviço para projetar o fluxo financeiro</p>
      </div>
    );
  }

  const selectedEntry = selectedMonth ? fluxo.find(f => f.mes === selectedMonth) : null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Projetado</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totalFluxo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Período</p>
            </div>
            <p className="text-sm font-medium">
              {fluxo.length > 0
                ? `${formatMonthLabel(fluxo[0].mes)} → ${formatMonthLabel(fluxo[fluxo.length - 1].mes)}`
                : '—'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{fluxo.length} meses com projeção</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Média Mensal</p>
            </div>
            <p className="text-xl font-bold font-mono">
              {formatCurrency(fluxo.length > 0 ? totalFluxo / fluxo.length : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground font-medium">Fluxo de Pagamentos Projetado (mensal)</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3" />
              Clique na barra para ver detalhes
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxo} onClick={(e) => {
                if (e?.activePayload?.[0]?.payload?.mes) {
                  setSelectedMonth(e.activePayload[0].payload.mes);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  formatter={(v: number) => [formatCurrency(v), 'Projeção']}
                  labelFormatter={formatMonthLabel}
                />
                <Legend />
                <Bar
                  dataKey="valor"
                  name="Pagamento projetado"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selectedEntry && (
        <Card className="border-primary/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">{formatMonthLabel(selectedEntry.mes)}</p>
                <p className="text-xs text-muted-foreground">{selectedEntry.itens.length} itens · Total: {formatCurrency(selectedEntry.valor)}</p>
              </div>
              <Badge variant={selectedEntry.mes <= mesAtual ? 'destructive' : 'outline'} className="text-[10px]">
                {selectedEntry.mes <= mesAtual ? 'Período passado' : 'Futuro'}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_120px_100px_100px_80px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-1">
                <span>Item</span>
                <span>Etapa / Serviço</span>
                <span>Fornecedor</span>
                <span>Forma Pgto</span>
                <span className="text-right">Valor</span>
              </div>
              {selectedEntry.itens.map((it, i) => (
                <div key={i} className={cn(
                  'grid grid-cols-[1fr_120px_100px_100px_80px] gap-2 text-xs py-1.5 rounded px-1',
                  i % 2 === 0 && 'bg-muted/20'
                )}>
                  <span className="truncate">{it.item}</span>
                  <span className="truncate text-muted-foreground" title={`${it.etapa} → ${it.servico}`}>
                    {it.servico}
                  </span>
                  <span className="truncate text-muted-foreground">{it.fornecedor ?? '—'}</span>
                  <span className="truncate text-muted-foreground">{it.forma_pagamento ?? '—'}</span>
                  <span className="text-right font-mono">{formatCurrency(it.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
