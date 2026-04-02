import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle, Send, Calendar, Package, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { usePrevisoesPlanejamento, useLancarPrevisao, type PrevisaoProjetada } from '@/hooks/usePrevisoesPlanejamento';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function PlanejamentoTab() {
  const { previsoes, isLoading, etapas } = usePrevisoesPlanejamento();
  const lancarMut = useLancarPrevisao();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [collapsedServicos, setCollapsedServicos] = useState<Record<string, boolean>>({});
  const [lancarDialog, setLancarDialog] = useState<PrevisaoProjetada | null>(null);
  const [lancarTipo, setLancarTipo] = useState<'despesa' | 'receita'>('despesa');

  // Group previsoes by etapa > servico
  const grouped = useMemo(() => {
    const map: Record<string, { etapa: string; grupo_id: string; servicos: Record<string, { servico: string; servico_id: string; itens: PrevisaoProjetada[] }> }> = {};
    previsoes.forEach(p => {
      if (!map[p.grupo_id]) {
        map[p.grupo_id] = { etapa: p.etapa_nome, grupo_id: p.grupo_id, servicos: {} };
      }
      if (!map[p.grupo_id].servicos[p.servico_id]) {
        map[p.grupo_id].servicos[p.servico_id] = { servico: p.servico_nome, servico_id: p.servico_id, itens: [] };
      }
      map[p.grupo_id].servicos[p.servico_id].itens.push(p);
    });
    return map;
  }, [previsoes]);

  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const toggleServico = (key: string) => setCollapsedServicos(p => ({ ...p, [key]: !p[key] }));

  const totalGeral = previsoes.reduce((s, p) => s + p.valor_total, 0);

  async function handleLancar() {
    if (!lancarDialog) return;
    try {
      await lancarMut.mutateAsync({
        tipo: lancarTipo,
        valor: lancarDialog.valor_total,
        fornecedor_id: lancarDialog.fornecedor_id ?? undefined,
        data_vencimento: lancarDialog.data_vencimento_projetada ?? undefined,
        departamento: lancarDialog.etapa_nome,
        categoria: lancarDialog.servico_nome,
        orcamento_item_id: lancarDialog.orcamento_item_id ?? undefined,
        observacao: `${lancarDialog.etapa_nome} > ${lancarDialog.servico_nome} > ${lancarDialog.item_nome}`,
      });
      setLancarDialog(null);
    } catch { /* handled by mutation */ }
  }

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (previsoes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum item planejado ainda.</p>
        <p className="text-xs mt-1">Cadastre etapas, serviços e itens no Planejamento para gerar previsões.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-xs text-muted-foreground">
          {previsoes.length} previsões projetadas · {Object.keys(grouped).length} etapas
        </span>
        <Badge variant="outline" className="font-mono text-xs">
          Total: {formatCurrency(totalGeral)}
        </Badge>
      </div>

      {/* Tree */}
      {Object.values(grouped).map(etapa => {
        const isOpen = !collapsed[etapa.grupo_id];
        const servicosList = Object.values(etapa.servicos);
        const etapaTotal = servicosList.reduce((s, sv) => s + sv.itens.reduce((ss, it) => ss + it.valor_total, 0), 0);

        return (
          <div key={etapa.grupo_id} className="rounded-lg border bg-card overflow-hidden">
            {/* Etapa header */}
            <button
              onClick={() => toggle(etapa.grupo_id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm flex-1">{etapa.etapa}</span>
              <span className="text-xs text-muted-foreground">{servicosList.length} serviço(s)</span>
              <Badge variant="outline" className="font-mono text-xs ml-2">
                {formatCurrency(etapaTotal)}
              </Badge>
            </button>

            {isOpen && (
              <div className="border-t">
                {servicosList.map(servico => {
                  const svcOpen = !collapsedServicos[servico.servico_id];
                  const svcTotal = servico.itens.reduce((s, it) => s + it.valor_total, 0);

                  return (
                    <div key={servico.servico_id} className="border-b last:border-b-0">
                      {/* Serviço header */}
                      <button
                        onClick={() => toggleServico(servico.servico_id)}
                        className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/30 transition-colors text-left"
                      >
                        {svcOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm font-medium flex-1 text-foreground/80">{servico.servico}</span>
                        <span className="text-[10px] text-muted-foreground">{servico.itens.length} ite{servico.itens.length === 1 ? 'm' : 'ns'}</span>
                        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(svcTotal)}</span>
                      </button>

                      {/* Itens */}
                      {svcOpen && (
                        <div className="bg-muted/10">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/30">
                                <th className="text-left py-1.5 px-8 font-medium text-muted-foreground">Item</th>
                                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Qtd</th>
                                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Unitário</th>
                                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Total</th>
                                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Vencimento</th>
                                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Prazo</th>
                                <th className="w-20 py-1.5 px-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {servico.itens.map(item => (
                                <tr key={item.id} className="border-t border-muted/20 hover:bg-muted/20 transition-colors">
                                  <td className="py-2 px-8 font-medium truncate max-w-[200px]">{item.item_nome}</td>
                                  <td className="py-2 px-2 text-center font-mono text-muted-foreground">
                                    {item.quantidade} {item.unidade}
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                                    {formatCurrency(item.valor_unitario)}
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono font-semibold">
                                    {formatCurrency(item.valor_total)}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {item.data_vencimento_projetada ? (
                                      <span className="flex items-center justify-center gap-1">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {formatDate(item.data_vencimento_projetada)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center text-muted-foreground">
                                    {item.dias_prazo_pagamento}d
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] gap-1"
                                      onClick={() => {
                                        setLancarDialog(item);
                                        setLancarTipo('despesa');
                                      }}
                                    >
                                      <Send className="h-3 w-3" />
                                      Lançar
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Lançar Dialog */}
      <Dialog open={!!lancarDialog} onOpenChange={open => !open && setLancarDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar como CPA/CRE</DialogTitle>
          </DialogHeader>
          {lancarDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium">{lancarDialog.item_nome}</p>
                <p className="text-xs text-muted-foreground">{lancarDialog.etapa_nome} → {lancarDialog.servico_nome}</p>
                <p className="font-mono font-bold text-lg">{formatCurrency(lancarDialog.valor_total)}</p>
                {lancarDialog.data_vencimento_projetada && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Vencimento projetado: {formatDate(lancarDialog.data_vencimento_projetada)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Tipo do lançamento</p>
                <div className="flex gap-2">
                  <button
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all',
                      lancarTipo === 'despesa'
                        ? 'border-destructive bg-destructive/5 text-destructive'
                        : 'border-border hover:border-destructive/40'
                    )}
                    onClick={() => setLancarTipo('despesa')}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    CPA · A Pagar
                  </button>
                  <button
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all',
                      lancarTipo === 'receita'
                        ? 'border-green-500 bg-green-500/5 text-green-600'
                        : 'border-border hover:border-green-500/40'
                    )}
                    onClick={() => setLancarTipo('receita')}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    CRE · A Receber
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                O lançamento será criado com status <strong>pendente</strong> e aparecerá na fila de aprovações.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLancarDialog(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleLancar} disabled={lancarMut.isPending}>
              {lancarMut.isPending ? 'Criando…' : 'Criar Lançamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
