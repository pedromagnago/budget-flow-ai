import { useMemo, useState } from 'react';
import { useEtapasCompletas } from '@/hooks/useEtapas';
import { useFornecedorResumo } from '@/hooks/useFornecedores';
import { useOrcamentoItens, useCreateGrupo, useUpdateGrupo, useDeleteGrupo, useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useOrcamentoCrud';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Layers, DollarSign, HardHat, Truck, Plus, Pencil, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EtapaCompleta } from '@/types';

function getEtapaHealth(e: EtapaCompleta) {
  if (e.lancamentos_vencidos > 0) return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Vencidos' };
  if (e.servicos_atrasados > 0) return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Atrasado' };
  if (e.pct_consumido > 90 && e.pct_fisico_concluido < 80) return { color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Atenção' };
  if (e.pct_fisico_concluido >= 100) return { color: 'text-consumido', bg: 'bg-consumido/10', label: 'Concluído' };
  return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Normal' };
}

function ItemsPanel({ grupoId }: { grupoId: string }) {
  const { data: itens, isLoading } = useOrcamentoItens(grupoId);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', valor_orcado: '', apropriacao: '', unidade: 'un' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ item: string; valor_orcado: string; apropriacao: string }>({ item: '', valor_orcado: '', apropriacao: '' });

  if (isLoading) return <div className="text-xs text-muted-foreground p-2">Carregando itens...</div>;

  const list = itens ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens Orçamentários ({list.length})</p>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3 mr-1" /> Item
        </Button>
      </div>

      {list.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground/60 italic py-2">Nenhum item cadastrado nesta etapa</p>
      )}

      <div className="space-y-1">
        {list.map(it => (
          <div key={it.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 group text-xs">
            {editingId === it.id ? (
              <>
                <Input className="h-6 text-xs flex-1" value={editValues.item} onChange={e => setEditValues(v => ({ ...v, item: e.target.value }))} />
                <Input className="h-6 text-xs w-20" value={editValues.apropriacao} onChange={e => setEditValues(v => ({ ...v, apropriacao: e.target.value }))} placeholder="Aprop." />
                <Input className="h-6 text-xs w-24 text-right" type="number" value={editValues.valor_orcado} onChange={e => setEditValues(v => ({ ...v, valor_orcado: e.target.value }))} />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                  await updateItem.mutateAsync({ id: it.id, item: editValues.item, apropriacao: editValues.apropriacao, valor_orcado: parseFloat(editValues.valor_orcado) || 0 });
                  setEditingId(null);
                }}><span className="text-xs">✓</span></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><span className="text-xs">✕</span></Button>
              </>
            ) : (
              <>
                <Package className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="flex-1 truncate">{it.item}</span>
                {it.apropriacao && <Badge variant="outline" className="text-[9px] h-4">{it.apropriacao}</Badge>}
                <span className="font-mono text-right w-24 shrink-0">{formatCurrency(it.valor_orcado)}</span>
                <span className={cn('font-mono text-right w-20 shrink-0', it.valor_saldo < 0 && 'text-destructive')}>
                  {formatCurrency(it.valor_saldo)}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                    setEditingId(it.id);
                    setEditValues({ item: it.item, valor_orcado: String(it.valor_orcado), apropriacao: it.apropriacao || '' });
                  }}><Pencil className="h-2.5 w-2.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteItem.mutate(it.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                </div>
              </>
            )}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 py-1.5 px-2 bg-primary/5 rounded-md text-xs">
            <Input className="h-6 text-xs flex-1" placeholder="Nome do item" value={newItem.item} onChange={e => setNewItem(v => ({ ...v, item: e.target.value }))} autoFocus />
            <Input className="h-6 text-xs w-20" placeholder="Aprop." value={newItem.apropriacao} onChange={e => setNewItem(v => ({ ...v, apropriacao: e.target.value }))} />
            <Input className="h-6 text-xs w-24 text-right" type="number" placeholder="Valor" value={newItem.valor_orcado} onChange={e => setNewItem(v => ({ ...v, valor_orcado: e.target.value }))} />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
              if (!newItem.item || !newItem.valor_orcado) return;
              await createItem.mutateAsync({ grupo_id: grupoId, item: newItem.item, apropriacao: newItem.apropriacao || undefined, valor_orcado: parseFloat(newItem.valor_orcado) || 0, unidade: newItem.unidade });
              setNewItem({ item: '', valor_orcado: '', apropriacao: '', unidade: 'un' });
              setAdding(false);
            }}><span className="text-xs">✓</span></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAdding(false)}><span className="text-xs">✕</span></Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EtapasOrcamentoTab() {
  const { data: etapas, isLoading } = useEtapasCompletas();
  const { data: fornecedoresResumo } = useFornecedorResumo();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createGrupo = useCreateGrupo();
  const updateGrupo = useUpdateGrupo();
  const deleteGrupo = useDeleteGrupo();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ nome: '', valor_total: '' });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupValues, setEditGroupValues] = useState({ nome: '', valor_total: '' });

  const totals = useMemo(() => {
    if (!etapas?.length) return { orcado: 0, consumido: 0, saldo: 0, lancamentos: 0, pago: 0 };
    return {
      orcado: etapas.reduce((s, e) => s + e.etapa_valor_orcado, 0),
      consumido: etapas.reduce((s, e) => s + e.soma_consumido_itens, 0),
      saldo: etapas.reduce((s, e) => s + e.soma_saldo_itens, 0),
      lancamentos: etapas.reduce((s, e) => s + e.valor_total_lancamentos, 0),
      pago: etapas.reduce((s, e) => s + e.valor_pago_lancamentos, 0),
    };
  }, [etapas]);

  if (isLoading) return <div className="p-4"><SkeletonTable rows={10} cols={8} /></div>;

  const list = etapas ?? [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Orçado Total</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.orcado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Consumido</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.consumido)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{totals.orcado > 0 ? formatPercent(totals.consumido / totals.orcado) : '0%'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lançamentos</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.lancamentos)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pago: {formatCurrency(totals.pago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fornecedores</p>
            </div>
            <p className="text-xl font-bold font-mono">{fornecedoresResumo?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Etapas list */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div>
            <h3 className="text-sm font-semibold">Etapas do Projeto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Orçamento × Físico × Financeiro por etapa</p>
          </div>
          <Button size="sm" onClick={() => setShowNewGroup(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Etapa
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Layers className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma etapa cadastrada</p>
            <p className="text-xs mt-1">Clique em "Nova Etapa" para começar</p>
          </div>
        ) : (
          <div className="divide-y">
            {list.map(e => {
              const health = getEtapaHealth(e);
              const isExpanded = expandedId === e.grupo_id;

              return (
                <div key={e.grupo_id}>
                  {/* Row */}
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors group">
                    <button
                      className="flex items-center gap-4 flex-1 text-left min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : e.grupo_id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{e.etapa_nome}</span>
                          <Badge variant="outline" className={cn('text-[10px]', health.bg, health.color)}>{health.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <Progress value={e.pct_consumido} className="h-1.5 flex-1 max-w-[200px]" />
                          <span className="text-[10px] font-mono text-muted-foreground">{e.pct_consumido}% consumido</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-6 text-xs shrink-0">
                        <div className="text-right">
                          <p className="text-muted-foreground">Orçado</p>
                          <p className="font-mono font-medium">{formatCurrency(e.etapa_valor_orcado)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Consumido</p>
                          <p className="font-mono">{formatCurrency(e.soma_consumido_itens)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Físico</p>
                          <p className="font-mono">{e.pct_fisico_concluido}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Serviços</p>
                          <p className="font-mono">{e.servicos_concluidos}/{e.total_servicos}</p>
                        </div>
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => {
                        setEditingGroupId(e.grupo_id);
                        setEditGroupValues({ nome: e.etapa_nome, valor_total: String(e.etapa_valor_orcado) });
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remover" onClick={() => {
                        if (confirm('Remover esta etapa?')) deleteGrupo.mutate(e.grupo_id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail with Items CRUD */}
                  {isExpanded && (
                    <div className="bg-muted/20 px-4 py-4 border-t space-y-4">
                      {/* Summary row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Orçamento</p>
                          <div className="flex justify-between"><span>Orçado</span><span className="font-mono">{formatCurrency(e.etapa_valor_orcado)}</span></div>
                          <div className="flex justify-between"><span>Itens</span><span className="font-mono">{e.total_itens}</span></div>
                          <div className="flex justify-between"><span>Consumido</span><span className="font-mono">{formatCurrency(e.soma_consumido_itens)}</span></div>
                          <div className="flex justify-between"><span>Saldo</span><span className={cn('font-mono', e.soma_saldo_itens < 0 && 'text-destructive')}>{formatCurrency(e.soma_saldo_itens)}</span></div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Físico</p>
                          <div className="flex justify-between"><span>Serviços</span><span className="font-mono">{e.total_servicos}</span></div>
                          <div className="flex justify-between"><span>Concluídos</span><span className="font-mono text-consumido">{e.servicos_concluidos}</span></div>
                          <div className="flex justify-between"><span>Atrasados</span><span className={cn('font-mono', e.servicos_atrasados > 0 && 'text-destructive')}>{e.servicos_atrasados}</span></div>
                          <div className="flex justify-between"><span>% Concluído</span><span className="font-mono">{e.pct_fisico_concluido}%</span></div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Financeiro</p>
                          <div className="flex justify-between"><span>Lançamentos</span><span className="font-mono">{e.total_lancamentos}</span></div>
                          <div className="flex justify-between"><span>Valor Total</span><span className="font-mono">{formatCurrency(e.valor_total_lancamentos)}</span></div>
                          <div className="flex justify-between"><span>Pago</span><span className="font-mono text-consumido">{formatCurrency(e.valor_pago_lancamentos)}</span></div>
                          <div className="flex justify-between"><span>Pendentes</span><span className="font-mono">{e.lancamentos_pendentes}</span></div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Análise</p>
                          <div className="flex justify-between"><span>Fornecedores</span><span className="font-mono">{e.total_fornecedores}</span></div>
                          {e.lancamentos_vencidos > 0 && (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{e.lancamentos_vencidos} vencido(s)</span>
                            </div>
                          )}
                          {e.pct_consumido > 80 && e.pct_fisico_concluido < 50 && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <TrendingUp className="h-3 w-3" />
                              <span>Consumo alto vs físico</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items CRUD Panel */}
                      <div className="border-t pt-4">
                        <ItemsPanel grupoId={e.grupo_id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog: Nova Etapa */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da etapa (ex: Fundação)" value={newGroup.nome} onChange={e => setNewGroup(v => ({ ...v, nome: e.target.value }))} autoFocus />
            <Input type="number" placeholder="Valor orçado (R$)" value={newGroup.valor_total} onChange={e => setNewGroup(v => ({ ...v, valor_total: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!newGroup.nome || !newGroup.valor_total) return;
              await createGrupo.mutateAsync({ nome: newGroup.nome, valor_total: parseFloat(newGroup.valor_total) || 0 });
              setNewGroup({ nome: '', valor_total: '' });
              setShowNewGroup(false);
            }} disabled={createGrupo.isPending}>
              {createGrupo.isPending ? 'Criando...' : 'Criar Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Etapa */}
      <Dialog open={!!editingGroupId} onOpenChange={open => { if (!open) setEditingGroupId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da etapa" value={editGroupValues.nome} onChange={e => setEditGroupValues(v => ({ ...v, nome: e.target.value }))} autoFocus />
            <Input type="number" placeholder="Valor orçado (R$)" value={editGroupValues.valor_total} onChange={e => setEditGroupValues(v => ({ ...v, valor_total: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroupId(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!editingGroupId) return;
              await updateGrupo.mutateAsync({ id: editingGroupId, nome: editGroupValues.nome, valor_total: parseFloat(editGroupValues.valor_total) || 0 });
              setEditingGroupId(null);
            }} disabled={updateGrupo.isPending}>
              {updateGrupo.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
