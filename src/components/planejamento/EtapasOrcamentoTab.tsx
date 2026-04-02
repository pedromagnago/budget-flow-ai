import { useMemo, useState } from 'react';
import { useEtapasHierarquicas } from '@/hooks/usePlanejamentoHierarquico';
import { useCreateGrupo, useUpdateGrupo, useDeleteGrupo } from '@/hooks/useOrcamentoCrud';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Layers, DollarSign, Wrench, Plus, Pencil, Trash2, HardHat } from 'lucide-react';
import { ServicoAccordion } from './ServicoAccordion';
import { AddServicoDialog } from './AddServicoDialog';
import { cn } from '@/lib/utils';

export function EtapasOrcamentoTab() {
  const { data: etapas, isLoading } = useEtapasHierarquicas();

  const createGrupo = useCreateGrupo();
  const updateGrupo = useUpdateGrupo();
  const deleteGrupo = useDeleteGrupo();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ nome: '', valor_total: '' });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupValues, setEditGroupValues] = useState({ nome: '', valor_total: '' });
  const [addServicoEtapa, setAddServicoEtapa] = useState<{ id: string; nome: string } | null>(null);

  const totals = useMemo(() => {
    if (!etapas?.length) return { orcado: 0, itens: 0, servicos: 0, etapas: 0 };
    return {
      orcado: etapas.reduce((s, e) => s + e.valor_total, 0),
      itens: etapas.reduce((s, e) => s + e.soma_total_itens, 0),
      servicos: etapas.reduce((s, e) => s + e.total_servicos, 0),
      etapas: etapas.length,
    };
  }, [etapas]);

  if (isLoading) return <div className="p-4"><SkeletonTable rows={10} cols={6} /></div>;

  const list = etapas ?? [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Etapas</p>
            </div>
            <p className="text-xl font-bold font-mono">{totals.etapas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Serviços</p>
            </div>
            <p className="text-xl font-bold font-mono">{totals.servicos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Orçado (Etapas)</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.orcado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Itens</p>
            </div>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.itens)}</p>
            {totals.orcado > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatPercent(totals.itens / totals.orcado)} do orçado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Etapas hierarchical list */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div>
            <h3 className="text-sm font-semibold">Planejamento da Obra</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Etapa → Serviço → Itens de aquisição</p>
          </div>
          <Button size="sm" onClick={() => setShowNewGroup(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Etapa
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Layers className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma etapa cadastrada</p>
            <p className="text-xs mt-1">Comece criando as etapas da obra (ex: Fundação, Alvenaria, Cobertura)</p>
          </div>
        ) : (
          <div className="divide-y">
            {list.map(e => {
              const isExpanded = expandedId === e.grupo_id;
              const pctUsado = e.valor_total > 0 ? (e.soma_total_itens / e.valor_total) * 100 : 0;

              return (
                <div key={e.grupo_id}>
                  {/* Etapa row */}
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors group">
                    <button
                      className="flex items-center gap-4 flex-1 text-left min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : e.grupo_id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      }

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{e.nome}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {e.total_servicos} serviço{e.total_servicos !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <Progress value={Math.min(pctUsado, 100)} className="h-1.5 flex-1 max-w-[200px]" />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {pctUsado.toFixed(0)}% planejado
                          </span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-6 text-xs shrink-0">
                        <div className="text-right">
                          <p className="text-muted-foreground">Orçado</p>
                          <p className="font-mono font-medium">{formatCurrency(e.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Itens</p>
                          <p className="font-mono">{formatCurrency(e.soma_total_itens)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Saldo</p>
                          <p className={cn('font-mono', (e.valor_total - e.soma_total_itens) < 0 && 'text-destructive')}>
                            {formatCurrency(e.valor_total - e.soma_total_itens)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => {
                        setEditingGroupId(e.grupo_id);
                        setEditGroupValues({ nome: e.nome, valor_total: String(e.valor_total) });
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

                  {/* Expanded: Serviços */}
                  {isExpanded && (
                    <div className="bg-muted/10 px-4 py-4 border-t space-y-3">
                      {e.servicos.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
                          Nenhum serviço nesta etapa. Adicione um serviço para começar a planejar os itens.
                        </p>
                      ) : (
                        e.servicos.map(sv => (
                          <ServicoAccordion key={sv.servico_id} servico={sv} grupoId={e.grupo_id} />
                        ))
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setAddServicoEtapa({ id: e.grupo_id, nome: e.nome })}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Serviço a "{e.nome}"
                      </Button>
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

      {/* Dialog: Novo Serviço */}
      {addServicoEtapa && (
        <AddServicoDialog
          open
          onClose={() => setAddServicoEtapa(null)}
          grupoId={addServicoEtapa.id}
          etapaNome={addServicoEtapa.nome}
        />
      )}
    </div>
  );
}
