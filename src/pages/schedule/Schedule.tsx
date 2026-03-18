import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { useCronogramaServicos, useMedicoes, useMedicoesMetas, useAvancoFisico } from '@/hooks/useSchedule';
import { ProgressModal } from '@/components/schedule/ProgressModal';
import { ImpactPanel } from '@/components/schedule/ImpactPanel';
import { MedicoesTable } from '@/components/schedule/MedicoesTable';
import { ServicosTable } from '@/components/schedule/ServicosTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrencyCompact } from '@/lib/formatters';

function getCellColor(meta: number, real: number) {
  if (real >= meta && meta > 0) return 'bg-consumido/10 text-consumido';
  if (real > 0) return 'bg-module-dashboard/10 text-module-dashboard';
  if (meta > 0) return 'bg-destructive/10 text-destructive';
  return 'bg-muted/30 text-muted-foreground';
}

interface ModalState {
  servicoId: string;
  servicoNome: string;
  medicaoNumero: number;
  qtdTotal: number;
}

export default function Schedule() {
  const { data: servicos, isLoading: loadingServicos } = useCronogramaServicos();
  const { data: medicoes, isLoading: loadingMedicoes } = useMedicoes();
  const { data: metas } = useMedicoesMetas();
  const { data: avancos } = useAvancoFisico();
  const [modal, setModal] = useState<ModalState | null>(null);

  const avancoMap = useMemo(() => {
    const map: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!map[a.servico_id] || pct > map[a.servico_id]) {
        map[a.servico_id] = pct;
      }
    });
    return map;
  }, [avancos]);

  const metaMap = useMemo(() => {
    const map: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      map[`${m.servico_id}_${m.medicao_numero}`] = m.meta_percentual;
    });
    return map;
  }, [metas]);

  // Build medicao numero -> valor_planejado map
  const medicaoValorMap = useMemo(() => {
    const map: Record<number, number> = {};
    (medicoes ?? []).forEach(m => { map[m.numero] = m.valor_planejado; });
    return map;
  }, [medicoes]);

  const medicaoNumbers = (medicoes ?? []).map(m => m.numero);
  const isLoading = loadingServicos || loadingMedicoes;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Cronograma Físico</h1>

      <Tabs defaultValue="avanco" className="space-y-4">
        <TabsList>
          <TabsTrigger value="avanco">Avanço Físico</TabsTrigger>
          <TabsTrigger value="medicoes">Medições & Pagamentos</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
        </TabsList>

        {/* ── Avanço Físico (grid original + valores planejados) ── */}
        <TabsContent value="avanco">
          <p className="text-sm text-muted-foreground mb-4">Avanço por serviço × medição — clique na célula para registrar progresso</p>

          <div className="bg-card border rounded-xl shadow-card overflow-auto">
            {isLoading ? (
              <div className="p-4"><SkeletonTable rows={10} cols={10} /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-3 sticky left-0 bg-muted/50 z-10 min-w-[200px]">Serviço</th>
                    {medicaoNumbers.map(n => (
                      <th key={n} className="text-center py-2 px-3 min-w-[90px]">M{n}</th>
                    ))}
                    <th className="text-center py-2 px-3 min-w-[80px]">% Geral</th>
                  </tr>
                  {/* Planned values row */}
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
                  {(servicos ?? []).map(servico => {
                    const realPct = avancoMap[servico.id] ?? 0;
                    const totalMeta = medicaoNumbers.reduce((s, n) => s + (metaMap[`${servico.id}_${n}`] ?? 0), 0);
                    const pctGeral = totalMeta > 0 ? (realPct / totalMeta) * 100 : (realPct > 0 ? 100 : 0);

                    return (
                      <tr key={servico.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 font-medium sticky left-0 bg-card z-10 text-xs">{servico.nome}</td>
                        {medicaoNumbers.map(n => {
                          const meta = metaMap[`${servico.id}_${n}`];
                          if (meta === undefined) {
                            return <td key={n} className="py-2 px-3 text-center text-muted-foreground/30">—</td>;
                          }
                          const cellReal = realPct >= totalMeta ? meta : Math.min(realPct, meta);
                          return (
                            <td key={n} className="py-1 px-2 text-center">
                              <div
                                className={cn('rounded px-2 py-1 text-[11px] font-mono cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all', getCellColor(meta, cellReal))}
                                onClick={() => setModal({
                                  servicoId: servico.id,
                                  servicoNome: servico.nome,
                                  medicaoNumero: n,
                                  qtdTotal: servico.quantidade ?? 64,
                                })}
                              >
                                {meta.toFixed(0)}% / {cellReal.toFixed(0)}%
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-mono text-xs font-bold">
                          {pctGeral.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <ImpactPanel
            medicoes={medicoes ?? []}
            servicos={servicos ?? []}
            metaMap={metaMap}
            avancoMap={avancoMap}
          />
        </TabsContent>

        {/* ── Medições & Pagamentos ── */}
        <TabsContent value="medicoes">
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={8} cols={7} /></div>
          ) : (
            <MedicoesTable medicoes={medicoes ?? []} />
          )}
        </TabsContent>

        {/* ── Serviços ── */}
        <TabsContent value="servicos">
          {loadingServicos ? (
            <div className="p-4"><SkeletonTable rows={10} cols={4} /></div>
          ) : (
            <ServicosTable servicos={servicos ?? []} />
          )}
        </TabsContent>
      </Tabs>

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
