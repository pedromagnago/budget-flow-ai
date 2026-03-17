import { useState, useMemo, useCallback } from 'react';
import { SlidersHorizontal, Plus, GitCompare, Trash2, Pencil, RotateCcw, TrendingDown, CalendarDays, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  useCenarios, useCreateCenario, useDeleteCenario,
  usePrevisoes, useAjustesCenario, useSaveAjuste, useRemoveAjuste,
  mergePrevisoes, calcularFluxo, calcularMetricas,
  type PrevisaoSimulada,
} from '@/hooks/useSimulator';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

export default function Simulator() {
  const { data: cenarios, isLoading: loadingCenarios } = useCenarios();
  const { data: previsoes, isLoading: loadingPrevisoes } = usePrevisoes();
  const createCenario = useCreateCenario();
  const deleteCenario = useDeleteCenario();
  const saveAjuste = useSaveAjuste();
  const removeAjuste = useRemoveAjuste();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'valor' | 'data_vencimento' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const selected = cenarios?.find(c => c.id === selectedId) ?? cenarios?.[0] ?? null;
  const activeId = selected?.id ?? null;

  const { data: ajustes } = useAjustesCenario(activeId);
  const { data: ajustesCompare } = useAjustesCenario(compareId);

  const simuladas = useMemo(
    () => mergePrevisoes(previsoes ?? [], ajustes ?? []),
    [previsoes, ajustes]
  );
  const fluxo = useMemo(() => calcularFluxo(simuladas), [simuladas]);
  const metricas = useMemo(() => calcularMetricas(fluxo), [fluxo]);

  // Compare scenario
  const simuladasCompare = useMemo(
    () => compareId ? mergePrevisoes(previsoes ?? [], ajustesCompare ?? []) : [],
    [previsoes, ajustesCompare, compareId]
  );
  const fluxoCompare = useMemo(() => compareId ? calcularFluxo(simuladasCompare) : [], [simuladasCompare, compareId]);

  // Merge fluxo data for chart
  const chartData = useMemo(() => {
    const map = new Map<string, { data: string; saldo: number; saldoCompare?: number }>();
    fluxo.forEach(f => map.set(f.data, { data: f.data, saldo: f.saldoAcumulado }));
    if (compareId) {
      fluxoCompare.forEach(f => {
        const existing = map.get(f.data);
        if (existing) existing.saldoCompare = f.saldoAcumulado;
        else map.set(f.data, { data: f.data, saldo: 0, saldoCompare: f.saldoAcumulado });
      });
    }
    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
  }, [fluxo, fluxoCompare, compareId]);

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    try {
      const c = await createCenario.mutateAsync({ nome: newNome, descricao: newDesc || undefined });
      setSelectedId(c.id);
      setShowNewDialog(false);
      setNewNome('');
      setNewDesc('');
      toast.success('Cenário criado');
    } catch { toast.error('Erro ao criar cenário'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCenario.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
      if (compareId === id) setCompareId(null);
      toast.success('Cenário removido');
    } catch { toast.error('Erro ao remover'); }
  };

  const startEdit = (p: PrevisaoSimulada, field: 'valor' | 'data_vencimento') => {
    if (!activeId) { toast.error('Selecione um cenário primeiro'); return; }
    setEditingCell({ id: p.id, field });
    setEditValue(field === 'valor' ? String(p.valor_simulado) : (p.vencimento_simulado ?? ''));
  };

  const saveEdit = useCallback(async () => {
    if (!editingCell || !activeId) return;
    const orig = previsoes?.find(p => p.id === editingCell.id);
    if (!orig) return;
    try {
      await saveAjuste.mutateAsync({
        cenario_id: activeId,
        referencia_id: editingCell.id,
        tipo_ajuste: 'edicao',
        campo_alterado: editingCell.field,
        valor_original: editingCell.field === 'valor' ? String(orig.valor) : (orig.data_vencimento ?? ''),
        valor_novo: editValue,
      });
      setEditingCell(null);
    } catch { toast.error('Erro ao salvar ajuste'); }
  }, [editingCell, activeId, editValue, previsoes, saveAjuste]);

  const resetAjuste = async (p: PrevisaoSimulada) => {
    if (!p.ajuste || !activeId) return;
    try {
      await removeAjuste.mutateAsync({ id: p.ajuste.id, cenario_id: activeId });
      toast.success('Ajuste removido');
    } catch { toast.error('Erro ao remover ajuste'); }
  };

  const loading = loadingCenarios || loadingPrevisoes;

  const chartConfig = {
    saldo: { label: 'Saldo Acumulado', color: 'hsl(var(--module-simulator))' },
    saldoCompare: { label: 'Comparação', color: 'hsl(var(--module-dashboard))' },
  };

  const metricCards = [
    { label: 'Saldo Mínimo', value: formatCurrencyCompact(metricas.saldoMinimo), accent: metricas.saldoMinimo < 0 ? 'text-destructive' : 'text-foreground', icon: TrendingDown },
    { label: 'Pior Dia', value: metricas.piorDia ? formatDate(metricas.piorDia) : '—', accent: 'text-foreground', icon: CalendarDays },
    { label: 'Dias Negativo', value: String(metricas.diasNegativo), accent: metricas.diasNegativo > 0 ? 'text-destructive' : 'text-foreground', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tighter">Simulador de Cenários</h1>
        <div className="flex items-center gap-2">
          {compareId ? (
            <Button variant="outline" size="sm" onClick={() => setCompareId(null)}>
              <GitCompare className="h-4 w-4 mr-2" /> Parar Comparação
            </Button>
          ) : (
            cenarios && cenarios.length > 1 && activeId && (
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value=""
                onChange={e => setCompareId(e.target.value || null)}
              >
                <option value="">Comparar com…</option>
                {cenarios.filter(c => c.id !== activeId).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )
          )}
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Cenário
          </Button>
        </div>
      </div>

      {/* Scenario tabs */}
      {loading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-32" />)}
        </div>
      ) : cenarios && cenarios.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {cenarios.map(c => (
            <div key={c.id} className="flex items-center gap-1">
              <Button
                size="sm"
                variant={c.id === activeId ? 'default' : 'outline'}
                onClick={() => setSelectedId(c.id)}
                className={c.id === activeId ? 'bg-module-simulator text-white hover:bg-module-simulator/90' : ''}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                {c.nome}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum cenário criado. Clique em "Novo Cenário" para começar.</p>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Left: editable list */}
        <div className="col-span-3 space-y-4">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="py-2 px-3 bg-muted/50 flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-module-simulator" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Previsões — {selected?.nome ?? 'Sem cenário'}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{simuladas.length} itens</span>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : simuladas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma previsão encontrada. Cadastre lançamentos com <code>e_previsao = true</code>.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fornecedor</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Dept.</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Vencimento</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {simuladas.map(p => (
                      <tr
                        key={p.id}
                        className={`border-t hover:bg-muted/30 transition-colors ${p.editado ? 'border-l-2 border-l-module-simulator' : ''}`}
                      >
                        <td className="py-2 px-3 font-medium truncate max-w-[200px]">
                          {p.fornecedor_razao ?? p.observacao ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{p.departamento_limpo ?? p.departamento ?? '—'}</td>

                        {/* Valor cell */}
                        <td className="py-2 px-3 text-right">
                          {editingCell?.id === p.id && editingCell.field === 'valor' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              className="h-7 w-28 ml-auto text-right font-mono"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`font-mono tabular-nums cursor-pointer hover:underline ${p.editado && p.valor_simulado !== p.valor ? 'text-module-simulator font-bold' : ''}`}
                              onClick={() => startEdit(p, 'valor')}
                            >
                              {formatCurrency(p.valor_simulado)}
                            </span>
                          )}
                        </td>

                        {/* Data cell */}
                        <td className="py-2 px-3">
                          {editingCell?.id === p.id && editingCell.field === 'data_vencimento' ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              className="h-7 w-36"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`cursor-pointer hover:underline text-muted-foreground ${p.editado && p.vencimento_simulado !== p.data_vencimento ? 'text-module-simulator font-semibold' : ''}`}
                              onClick={() => startEdit(p, 'data_vencimento')}
                            >
                              {p.vencimento_simulado ? formatDate(p.vencimento_simulado) : '—'}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.editado ? 'bg-module-simulator/10 text-module-simulator' : 'bg-muted text-muted-foreground'}`}>
                            {p.editado ? 'Alterado' : 'Original'}
                          </span>
                        </td>

                        <td className="py-2 px-3">
                          {p.editado && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => resetAjuste(p)} title="Reverter">
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: chart + metrics */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
              Fluxo de Caixa Simulado
            </p>
            {loading || chartData.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
                {loading ? <Skeleton className="h-40 w-full" /> : 'Sem dados para exibir'}
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-52 w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="data"
                    tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                    className="text-[10px]"
                  />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-[10px]" width={45} />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="hsl(var(--module-simulator))"
                    fill="hsl(var(--module-simulator) / 0.15)"
                    strokeWidth={2}
                  />
                  {compareId && (
                    <Area
                      type="monotone"
                      dataKey="saldoCompare"
                      stroke="hsl(var(--module-dashboard))"
                      fill="hsl(var(--module-dashboard) / 0.1)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </AreaChart>
              </ChartContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {metricCards.map(c => (
              <div key={c.label} className="bg-card border rounded-xl p-3 shadow-sm text-center">
                <c.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                <p className={`font-mono text-lg font-bold ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Scenario Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cenário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do cenário" value={newNome} onChange={e => setNewNome(e.target.value)} />
            <Input placeholder="Descrição (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCenario.isPending || !newNome.trim()}>
              {createCenario.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
