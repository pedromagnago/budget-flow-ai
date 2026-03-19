import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { ProgressModal } from '@/components/schedule/ProgressModal';
import { useCronogramaServicos, useMedicoes, useMedicoesMetas, useAvancoFisico } from '@/hooks/useSchedule';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

function getCellColor(meta: number, real: number) {
  if (real >= meta && meta > 0) return 'bg-consumido/10 text-consumido';
  if (real >= meta * 0.8 && meta > 0) return 'bg-module-dashboard/10 text-module-dashboard';
  if (meta > 0) return 'bg-destructive/10 text-destructive';
  return 'bg-muted/30 text-muted-foreground';
}

interface ModalState {
  servicoId: string;
  servicoNome: string;
  medicaoNumero: number;
  qtdTotal: number;
}

export function AvancoFisicoTab() {
  const { data: servicos, isLoading: ls } = useCronogramaServicos();
  const { data: medicoes, isLoading: lm } = useMedicoes();
  const { data: metas } = useMedicoesMetas();
  const { data: avancos } = useAvancoFisico();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const avancoMap = useMemo(() => {
    const map: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!map[a.servico_id] || pct > map[a.servico_id]) map[a.servico_id] = pct;
    });
    return map;
  }, [avancos]);

  const metaMap = useMemo(() => {
    const map: Record<string, number> = {};
    (metas ?? []).forEach(m => { map[`${m.servico_id}_${m.medicao_numero}`] = m.meta_percentual; });
    return map;
  }, [metas]);

  const medicaoValorMap = useMemo(() => {
    const map: Record<number, number> = {};
    (medicoes ?? []).forEach(m => { map[m.numero] = m.valor_planejado; });
    return map;
  }, [medicoes]);

  const medicaoNumbers = (medicoes ?? []).map(m => m.numero);

  // Filter services
  const filtered = useMemo(() => {
    let list = servicos ?? [];
    if (search) list = list.filter(s => s.nome.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'todos') {
      list = list.filter(s => {
        const real = avancoMap[s.id] ?? 0;
        const totalMeta = medicaoNumbers.reduce((acc, n) => acc + (metaMap[`${s.id}_${n}`] ?? 0), 0);
        if (statusFilter === 'concluido') return real >= totalMeta && totalMeta > 0;
        if (statusFilter === 'atrasado') return real < totalMeta * 0.8 && totalMeta > 0;
        if (statusFilter === 'em_andamento') return real > 0 && real < totalMeta;
        if (statusFilter === 'futuro') return real === 0 && totalMeta === 0;
        return true;
      });
    }
    return list;
  }, [servicos, search, statusFilter, avancoMap, metaMap, medicaoNumbers]);

  // Totals per medicao
  const medicaoTotals = useMemo(() => {
    const map: Record<number, { real: number; plan: number; count: number }> = {};
    medicaoNumbers.forEach(n => {
      let totalReal = 0, totalPlan = 0, count = 0;
      (servicos ?? []).forEach(sv => {
        const meta = metaMap[`${sv.id}_${n}`] ?? 0;
        if (meta > 0) {
          count++;
          totalPlan += meta;
          const totalMetaUpTo = Array.from({ length: n }, (_, i) => metaMap[`${sv.id}_${i + 1}`] ?? 0).reduce((a, b) => a + b, 0);
          const real = Math.min(avancoMap[sv.id] ?? 0, totalMetaUpTo);
          totalReal += real > 0 ? meta : 0; // simplified
        }
      });
      map[n] = { real: count > 0 ? totalReal / count : 0, plan: count > 0 ? totalPlan / count : 0, count };
    });
    return map;
  }, [servicos, medicaoNumbers, metaMap, avancoMap]);

  if (ls || lm) return <div className="p-4"><SkeletonTable rows={10} cols={10} /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input className="h-8 w-64 text-xs" placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="atrasado">Atrasados</SelectItem>
            <SelectItem value="futuro">Futuros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-3 sticky left-0 bg-muted/50 z-10 min-w-[220px]">Serviço</th>
              {medicaoNumbers.map(n => (
                <th key={n} className="text-center py-2 px-3 min-w-[90px]">M{n}</th>
              ))}
              <th className="text-center py-2 px-3 min-w-[80px]">% Geral</th>
            </tr>
            {/* Totals row */}
            <tr className="bg-muted/30 border-b">
              <td className="text-left py-1 px-3 sticky left-0 bg-muted/30 z-10 text-[10px] text-muted-foreground font-medium">Planejado (R$)</td>
              {medicaoNumbers.map(n => (
                <td key={n} className="text-center py-1 px-3 text-[10px] font-mono text-muted-foreground">
                  {formatCurrencyCompact(medicaoValorMap[n] ?? 0)}
                </td>
              ))}
              <td />
            </tr>
          </thead>
          <tbody>
            {filtered.map(servico => {
              const realPct = avancoMap[servico.id] ?? 0;
              const totalMeta = medicaoNumbers.reduce((s, n) => s + (metaMap[`${servico.id}_${n}`] ?? 0), 0);
              const pctGeral = totalMeta > 0 ? Math.min((realPct / totalMeta) * 100, 100) : (realPct > 0 ? 100 : 0);
              const statusColor = pctGeral >= 100 ? 'bg-consumido' : pctGeral >= 80 ? 'bg-module-dashboard' : pctGeral > 0 ? 'bg-destructive' : 'bg-muted';

              return (
                <tr key={servico.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3 sticky left-0 bg-card z-10">
                    <div className="space-y-1">
                      <p className="text-xs font-medium">{servico.nome}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${Math.min(pctGeral, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{pctGeral.toFixed(0)}%</span>
                      </div>
                    </div>
                  </td>
                  {medicaoNumbers.map(n => {
                    const meta = metaMap[`${servico.id}_${n}`];
                    if (meta === undefined) return <td key={n} className="py-2 px-3 text-center text-muted-foreground/30">—</td>;
                    const cellReal = realPct >= totalMeta ? meta : Math.min(realPct, meta);
                    return (
                      <td key={n} className="py-1 px-2 text-center">
                        <div
                          className={cn('rounded px-2 py-1 text-[11px] font-mono cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all', getCellColor(meta, cellReal))}
                          onClick={() => setModal({ servicoId: servico.id, servicoNome: servico.nome, medicaoNumero: n, qtdTotal: servico.quantidade ?? 64 })}
                        >
                          {cellReal.toFixed(0)}% / {meta.toFixed(0)}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center font-mono text-xs font-bold">{pctGeral.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ProgressModal
          servicoId={modal.servicoId}
          servicoNome={modal.servicoNome}
          medicaoNumero={modal.medicaoNumero}
          qtdTotal={modal.qtdTotal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
