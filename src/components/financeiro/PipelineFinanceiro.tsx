import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2, XCircle, Clock, ArrowRight, ChevronDown, ChevronRight,
  AlertTriangle, Banknote, Eye, ShieldCheck, ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  usePipelineFinanceiro,
  usePipelineResumo,
  useAprovarLancamento,
  useRejeitarLancamento,
  useAprovarEmLote,
  FASE_CONFIG,
  PIPELINE_FASES,
  type FasePipeline,
  type LancamentoPipeline,
} from '@/hooks/usePipeline';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface Props {
  tipo: 'despesa' | 'receita';
}

export function PipelineFinanceiro({ tipo }: Props) {
  const { data: lancamentos = [], isLoading } = usePipelineFinanceiro(tipo);
  const { data: resumos = [] } = usePipelineResumo();
  const { role } = useAuth();
  const aprovarMut = useAprovarLancamento();
  const rejeitarMut = useRejeitarLancamento();
  const aprovarLoteMut = useAprovarEmLote();

  const [expandedFases, setExpandedFases] = useState<Set<string>>(
    new Set(['aguardando_aprovacao', 'a_pagar', 'vence_em_breve', 'atrasado'])
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRejeitar, setShowRejeitar] = useState<LancamentoPipeline | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showDetail, setShowDetail] = useState<LancamentoPipeline | null>(null);

  const canApprove = role === 'supervisor' || role === 'super_admin';

  // Group by fase
  const byFase = useMemo(() => {
    const map: Record<FasePipeline, LancamentoPipeline[]> = {
      previsao: [], aguardando_aprovacao: [], rejeitado: [],
      a_pagar: [], vence_em_breve: [], atrasado: [],
      pago: [], cancelado: [],
    };
    lancamentos.forEach(l => {
      const fase = l.fase as FasePipeline;
      if (map[fase]) map[fase].push(l);
    });
    return map;
  }, [lancamentos]);

  // Resumo cards do tipo
  const resumoTipo = useMemo(() => {
    return resumos.filter(r => r.tipo === tipo);
  }, [resumos, tipo]);

  const totalGeral = useMemo(() => {
    return lancamentos.reduce((s, l) => s + Math.abs(l.valor), 0);
  }, [lancamentos]);

  const totalPago = useMemo(() => {
    return lancamentos.filter(l => l.fase === 'pago').reduce((s, l) => s + Math.abs(l.valor_pago || l.valor), 0);
  }, [lancamentos]);

  const totalAtrasado = useMemo(() => {
    return lancamentos.filter(l => l.fase === 'atrasado').reduce((s, l) => s + Math.abs(l.valor), 0);
  }, [lancamentos]);

  const totalAguardando = useMemo(() => {
    return lancamentos.filter(l => l.fase === 'aguardando_aprovacao').reduce((s, l) => s + Math.abs(l.valor), 0);
  }, [lancamentos]);

  const toggleFase = (f: string) => {
    setExpandedFases(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAprovar = async (id: string) => {
    try {
      await aprovarMut.mutateAsync(id);
      toast.success('Lançamento aprovado');
    } catch { toast.error('Erro ao aprovar'); }
  };

  const handleRejeitar = async () => {
    if (!showRejeitar) return;
    try {
      await rejeitarMut.mutateAsync({ id: showRejeitar.id, motivo: motivoRejeicao });
      toast.success('Lançamento rejeitado');
      setShowRejeitar(null);
      setMotivoRejeicao('');
    } catch { toast.error('Erro ao rejeitar'); }
  };

  const handleAprovarLote = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await aprovarLoteMut.mutateAsync(ids);
      toast.success(`${ids.length} lançamento(s) aprovado(s)`);
      setSelectedIds(new Set());
    } catch { toast.error('Erro ao aprovar em lote'); }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Carregando pipeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalGeral)}</p>
            <p className="text-[10px] text-muted-foreground">{lancamentos.length} lançamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Aguardando Aprovação</p>
            <p className="text-xl font-bold font-mono mt-1 text-amber-600">{formatCurrency(totalAguardando)}</p>
            <p className="text-[10px] text-muted-foreground">{byFase.aguardando_aprovacao.length} lançamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Atrasado</p>
            <p className="text-xl font-bold font-mono mt-1 text-destructive">{formatCurrency(totalAtrasado)}</p>
            <p className="text-[10px] text-muted-foreground">{byFase.atrasado.length} lançamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pago</p>
            <p className="text-xl font-bold font-mono mt-1 text-emerald-600">{formatCurrency(totalPago)}</p>
            <Progress value={totalGeral > 0 ? (totalPago / totalGeral) * 100 : 0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Batch approve bar */}
      {selectedIds.size > 0 && canApprove && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" onClick={handleAprovarLote} disabled={aprovarLoteMut.isPending}>
            Aprovar selecionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
        </div>
      )}

      {/* Pipeline lanes */}
      <div className="space-y-3">
        {PIPELINE_FASES.map(fase => {
          const items = byFase[fase];
          const cfg = FASE_CONFIG[fase];
          const isExpanded = expandedFases.has(fase);
          const total = items.reduce((s, l) => s + Math.abs(l.valor), 0);

          if (items.length === 0 && fase !== 'aguardando_aprovacao') return null;

          return (
            <div key={fase} className="rounded-lg border bg-card overflow-hidden">
              {/* Lane header */}
              <button
                onClick={() => toggleFase(fase)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div className={cn('w-3 h-3 rounded-full')} style={{ backgroundColor: cfg.color }} />
                <span className="font-semibold text-sm">{cfg.label}</span>
                <Badge variant="secondary" className="text-[10px] font-mono ml-1">
                  {items.length}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto font-mono">
                  {formatCurrency(total)}
                </span>
              </button>

              {/* Lane items */}
              {isExpanded && (
                <div className="divide-y border-t">
                  {items.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs py-6">Nenhum lançamento nesta fase</div>
                  ) : items.map(l => (
                    <div
                      key={l.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/30 transition-colors',
                        fase === 'atrasado' && 'bg-destructive/5',
                      )}
                    >
                      {/* Checkbox para aprovação em lote */}
                      {fase === 'aguardando_aprovacao' && canApprove && (
                        <Checkbox
                          checked={selectedIds.has(l.id)}
                          onCheckedChange={() => toggleSelect(l.id)}
                        />
                      )}

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[200px]">
                            {l.fornecedor_razao ?? 'Sem fornecedor'}
                          </span>
                          {l.etapa_nome && (
                            <Badge variant="outline" className="text-[9px] shrink-0">
                              {l.etapa_nome}
                            </Badge>
                          )}
                          {l.orcamento_item_nome && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[9px] shrink-0 bg-primary/5">
                                  📋 Orçamento
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{l.orcamento_item_nome}</p>
                                {l.orcamento_valor_orcado && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Orçado: {formatCurrency(l.orcamento_valor_orcado)} |
                                    Consumido: {formatCurrency(l.orcamento_valor_consumido ?? 0)}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {(l.total_parcelas ?? 1) > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              {l.numero_parcela}/{l.total_parcelas}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {l.departamento_limpo ?? l.departamento ?? ''}
                          </span>
                          {l.categoria && (
                            <span className="text-[10px] text-muted-foreground">· {l.categoria}</span>
                          )}
                        </div>
                      </div>

                      {/* Vencimento */}
                      <div className="text-right shrink-0">
                        {l.data_vencimento ? (
                          <span className={cn(
                            'text-xs',
                            (l.dias_ate_vencimento ?? 0) < 0 && 'text-destructive font-semibold',
                            (l.dias_ate_vencimento ?? 0) === 0 && 'text-yellow-600 font-semibold',
                          )}>
                            {format(new Date(l.data_vencimento + 'T12:00:00'), 'dd/MM/yy')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                        {l.dias_ate_vencimento !== null && l.dias_ate_vencimento < 0 && fase !== 'pago' && (
                          <p className="text-[9px] text-destructive">
                            {Math.abs(l.dias_ate_vencimento)}d atraso
                          </p>
                        )}
                      </div>

                      {/* Valor */}
                      <div className="text-right font-mono tabular-nums w-28 shrink-0">
                        <span className="text-sm">{formatCurrency(l.valor)}</span>
                        {l.valor_pago > 0 && l.valor_pago !== Math.abs(l.valor) && (
                          <p className="text-[10px] text-emerald-600">Pago: {formatCurrency(l.valor_pago)}</p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Detalhes"
                          onClick={() => setShowDetail(l)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {fase === 'aguardando_aprovacao' && canApprove && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Aprovar"
                              onClick={() => handleAprovar(l.id)}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Rejeitar"
                              onClick={() => { setShowRejeitar(l); setMotivoRejeicao(''); }}>
                              <ShieldX className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Rejeitar */}
      <Dialog open={!!showRejeitar} onOpenChange={() => setShowRejeitar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {showRejeitar?.fornecedor_razao ?? 'Sem fornecedor'} — {formatCurrency(showRejeitar?.valor ?? 0)}
            </p>
            <div>
              <Label>Motivo da rejeição</Label>
              <Input
                value={motivoRejeicao}
                onChange={e => setMotivoRejeicao(e.target.value)}
                placeholder="Ex: valor divergente do contrato"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejeitar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={!motivoRejeicao || rejeitarMut.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Lançamento</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Fornecedor</p>
                  <p className="font-medium">{showDetail.fornecedor_razao ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                  <p className="font-mono font-bold">{formatCurrency(showDetail.valor)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Vencimento</p>
                  <p>{showDetail.data_vencimento ? format(new Date(showDetail.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Fase</p>
                  <Badge variant="secondary" className={cn('text-[10px]', FASE_CONFIG[showDetail.fase]?.bgClass, FASE_CONFIG[showDetail.fase]?.textClass)}>
                    {FASE_CONFIG[showDetail.fase]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Departamento</p>
                  <p>{showDetail.departamento_limpo ?? showDetail.departamento ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Categoria</p>
                  <p>{showDetail.categoria ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Forma Pagamento</p>
                  <p>{showDetail.forma_pagamento ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Aprovação</p>
                  <p className={cn(
                    showDetail.status_aprovacao === 'aprovado' && 'text-emerald-600',
                    showDetail.status_aprovacao === 'rejeitado' && 'text-destructive',
                  )}>
                    {showDetail.status_aprovacao === 'aprovado' ? '✓ Aprovado' :
                     showDetail.status_aprovacao === 'rejeitado' ? '✗ Rejeitado' :
                     '⏳ Pendente'}
                  </p>
                </div>
              </div>
              {showDetail.etapa_nome && (
                <div className="border rounded-lg p-3 bg-accent/30">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Vínculo Orçamentário</p>
                  <p className="font-medium">{showDetail.etapa_nome} → {showDetail.orcamento_item_nome}</p>
                  {showDetail.orcamento_valor_orcado && (
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Orçado: {formatCurrency(showDetail.orcamento_valor_orcado)}</span>
                      <span>Consumido: {formatCurrency(showDetail.orcamento_valor_consumido ?? 0)}</span>
                    </div>
                  )}
                </div>
              )}
              {showDetail.observacao && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Observação</p>
                  <p className="text-xs">{showDetail.observacao}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
