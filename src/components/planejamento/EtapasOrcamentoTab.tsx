import { useMemo, useState } from 'react';
import { useEtapasCompletas } from '@/hooks/useEtapas';
import { useFornecedorResumo } from '@/hooks/useFornecedores';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Layers, DollarSign, HardHat, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EtapaCompleta } from '@/types';

function getEtapaHealth(e: EtapaCompleta) {
  if (e.lancamentos_vencidos > 0) return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Vencidos' };
  if (e.servicos_atrasados > 0) return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Atrasado' };
  if (e.pct_consumido > 90 && e.pct_fisico_concluido < 80) return { color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Atenção' };
  if (e.pct_fisico_concluido >= 100) return { color: 'text-consumido', bg: 'bg-consumido/10', label: 'Concluído' };
  return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Normal' };
}

export function EtapasOrcamentoTab() {
  const { data: etapas, isLoading } = useEtapasCompletas();
  const { data: fornecedoresResumo } = useFornecedorResumo();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Etapas do Projeto — Visão Cruzada</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Orçamento × Físico × Financeiro por etapa</p>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Layers className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma etapa cadastrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {list.map(e => {
              const health = getEtapaHealth(e);
              const isExpanded = expandedId === e.grupo_id;

              return (
                <div key={e.grupo_id}>
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
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

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="bg-muted/20 px-4 py-4 border-t">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
