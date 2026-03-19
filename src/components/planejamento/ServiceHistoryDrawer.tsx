import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAvancoFisico, useMedicoesMetas } from '@/hooks/useSchedule';
import { formatDate } from '@/lib/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Props {
  servicoId: string | null;
  servicoNome: string;
  onClose: () => void;
  onNavigateServicos?: () => void;
}

export function ServiceHistoryDrawer({ servicoId, servicoNome, onClose, onNavigateServicos }: Props) {
  const { data: avancos } = useAvancoFisico();
  const { data: metas } = useMedicoesMetas();

  const history = useMemo(() => {
    if (!servicoId) return [];
    return (avancos ?? [])
      .filter(a => a.servico_id === servicoId)
      .sort((a, b) => a.data_registro.localeCompare(b.data_registro));
  }, [avancos, servicoId]);

  const chartData = useMemo(() => {
    if (!servicoId) return [];
    const metaMap: Record<number, number> = {};
    (metas ?? []).forEach(m => {
      if (m.servico_id === servicoId) metaMap[m.medicao_numero] = (metaMap[m.medicao_numero - 1] ?? 0) + m.meta_percentual;
    });

    let acumPct = 0;
    return history.map((h, i) => {
      acumPct = Math.max(acumPct, h.percentual_real ?? 0);
      return {
        date: formatDate(h.data_registro),
        real: acumPct,
        meta: Object.values(metaMap)[i] ?? acumPct,
      };
    });
  }, [history, metas, servicoId]);

  return (
    <Sheet open={servicoId !== null} onOpenChange={() => onClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{servicoNome}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Chart */}
          {chartData.length > 1 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  <Line dataKey="real" stroke="hsl(var(--consumido))" strokeWidth={2} dot={{ r: 2 }} name="Real" />
                  <Line dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} dot={false} name="Meta" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de avanços</p>
            {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhum registro encontrado.</p>}
            {history.map(h => (
              <div key={h.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium">{formatDate(h.data_registro)}</span>
                    <Badge variant="outline" className="text-[10px]">{h.casas_concluidas} casas</Badge>
                    <span className="font-mono text-consumido">{(h.percentual_real ?? 0).toFixed(0)}%</span>
                  </div>
                  {h.observacoes && <p className="text-[10px] text-muted-foreground mt-0.5">{h.observacoes}</p>}
                </div>
              </div>
            ))}
          </div>

          {onNavigateServicos && (
            <Button variant="outline" size="sm" className="w-full" onClick={onNavigateServicos}>
              Editar este serviço
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
