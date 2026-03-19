import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { useCronogramaServicos, useMedicoes, useMedicoesMetas, useAvancoFisico, useRegisterAvanco } from '@/hooks/useSchedule';
import { formatCurrencyCompact } from '@/lib/formatters';
import { toast } from 'sonner';

function getCellColor(meta: number, real: number) {
  if (real >= meta && meta > 0) return 'bg-consumido/10 text-consumido';
  if (real >= meta * 0.8 && meta > 0) return 'bg-module-dashboard/10 text-module-dashboard';
  if (meta > 0) return 'bg-destructive/10 text-destructive';
  return 'bg-muted/30 text-muted-foreground';
}

interface DrawerState {
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
  const registerMut = useRegisterAvanco();

  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [drawerForm, setDrawerForm] = useState({
    casas: 0, percentual: '0', usePercentual: false,
    data: new Date().toISOString().split('T')[0],
    responsavel: '', observacao: '',
  });

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

  function openDrawer(state: DrawerState) {
    setDrawer(state);
    setDrawerForm({
      casas: 0, percentual: '0', usePercentual: false,
      data: new Date().toISOString().split('T')[0],
      responsavel: '', observacao: '',
    });
  }

  async function handleSaveAvanco() {
    if (!drawer) return;
    const casas = drawerForm.usePercentual
      ? Math.round((parseFloat(drawerForm.percentual) / 100) * drawer.qtdTotal)
      : drawerForm.casas;

    if (casas < 0 || casas > drawer.qtdTotal) {
      toast.error(`Valor deve estar entre 0 e ${drawer.qtdTotal}`);
      return;
    }

    try {
      await registerMut.mutateAsync({
        servicoId: drawer.servicoId,
        casasConcluidas: casas,
        qtdTotal: drawer.qtdTotal,
      });
      toast.success(`Avanço registrado: ${casas}/${drawer.qtdTotal} casas (${((casas / drawer.qtdTotal) * 100).toFixed(1)}%)`);
      setDrawer(null);
    } catch {
      toast.error('Erro ao registrar avanço');
    }
  }

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
                          onClick={() => openDrawer({
                            servicoId: servico.id,
                            servicoNome: servico.nome,
                            medicaoNumero: n,
                            qtdTotal: servico.quantidade ?? 64,
                          })}
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

      {/* Drawer de registro de avanço */}
      <Sheet open={drawer !== null} onOpenChange={() => setDrawer(null)}>
        <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Registrar Avanço</SheetTitle>
          </SheetHeader>
          {drawer && (
            <div className="space-y-5 mt-4">
              <div>
                <p className="text-xs text-muted-foreground">Serviço</p>
                <p className="text-sm font-medium">{drawer.servicoNome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medição</p>
                <p className="text-sm font-medium font-mono">M{drawer.medicaoNumero}</p>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Entrada por percentual</Label>
                <Switch
                  checked={drawerForm.usePercentual}
                  onCheckedChange={v => setDrawerForm(f => ({ ...f, usePercentual: v }))}
                />
              </div>

              {drawerForm.usePercentual ? (
                <div className="space-y-2">
                  <Label className="text-xs">Percentual concluído</Label>
                  <Input
                    type="number"
                    min={0} max={100} step={0.1}
                    value={drawerForm.percentual}
                    onChange={e => setDrawerForm(f => ({ ...f, percentual: e.target.value }))}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {Math.round((parseFloat(drawerForm.percentual) / 100) * drawer.qtdTotal)} de {drawer.qtdTotal} casas
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Casas concluídas</Label>
                  <Input
                    type="number"
                    min={0} max={drawer.qtdTotal}
                    value={drawerForm.casas}
                    onChange={e => setDrawerForm(f => ({ ...f, casas: parseInt(e.target.value) || 0 }))}
                    className="h-9 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Total: {drawer.qtdTotal} — {drawer.qtdTotal > 0 ? ((drawerForm.casas / drawer.qtdTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Data do registro</Label>
                <Input type="date" value={drawerForm.data} onChange={e => setDrawerForm(f => ({ ...f, data: e.target.value }))} className="h-9 text-sm" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Responsável</Label>
                <Input value={drawerForm.responsavel} onChange={e => setDrawerForm(f => ({ ...f, responsavel: e.target.value }))} className="h-9 text-sm" placeholder="Nome do responsável" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Observação</Label>
                <Textarea value={drawerForm.observacao} onChange={e => setDrawerForm(f => ({ ...f, observacao: e.target.value }))} rows={3} placeholder="Detalhes do avanço..." />
              </div>

              <Button className="w-full" onClick={handleSaveAvanco} disabled={registerMut.isPending}>
                Salvar Avanço
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
