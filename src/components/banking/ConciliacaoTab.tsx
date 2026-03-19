import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLancamentosPendentes, useMovimentacoesSemLancamento, useConciliar, useContasSaldo } from '@/hooks/useBanking';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { ArrowRight, Link2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-module-dashboard/10 text-module-dashboard',
  atrasado: 'bg-destructive/10 text-destructive',
  vence_em_breve: 'bg-module-schedule/10 text-module-schedule',
};

export function ConciliacaoTab() {
  const { data: lancamentos, isLoading: ll } = useLancamentosPendentes();
  const { data: movimentacoes, isLoading: lm } = useMovimentacoesSemLancamento();
  const { data: contas } = useContasSaldo();
  const conciliarMut = useConciliar();

  const [selectedLanc, setSelectedLanc] = useState<string | null>(null);
  const [selectedMov, setSelectedMov] = useState<string | null>(null);

  const contaMap: Record<string, string> = {};
  (contas ?? []).forEach(c => { contaMap[c.id] = c.nome; });

  const lancList = lancamentos ?? [];
  const movList = movimentacoes ?? [];

  const selLanc = lancList.find(l => l.id === selectedLanc);
  const selMov = movList.find(m => m.id === selectedMov);

  async function handleConciliar() {
    if (!selLanc || !selMov) return;
    try {
      await conciliarMut.mutateAsync({
        lancamentoId: selLanc.id, movimentacaoId: selMov.id,
        data: selMov.data, valor: selMov.valor,
      });
      toast.success('Conciliação realizada');
      setSelectedLanc(null);
      setSelectedMov(null);
    } catch { toast.error('Erro ao conciliar'); }
  }

  const totalPrevisto = lancList.reduce((s, l) => s + Math.abs(l.valor), 0);
  const totalReal = movList.reduce((s, m) => s + m.valor, 0);
  const diferenca = totalReal + totalPrevisto; // previsto is negative (despesa)

  const loading = ll || lm;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      {selectedLanc && selectedMov && (
        <div className="flex items-center justify-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-xs font-medium">
            {selLanc?.fornecedor_razao ?? 'Lançamento'} <span className="font-mono">{formatCurrency(Math.abs(selLanc?.valor ?? 0))}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">
            {selMov?.descricao ?? 'Movimentação'} <span className="font-mono">{formatCurrency(Math.abs(selMov?.valor ?? 0))}</span>
          </span>
          <Button size="sm" onClick={handleConciliar} disabled={conciliarMut.isPending}>
            <Link2 className="h-3.5 w-3.5 mr-1" /> Conciliar Par
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left panel: Lançamentos previstos */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="font-semibold text-sm mb-3">Lançamentos Previstos sem Movimentação</h3>
            <p className="text-[10px] text-muted-foreground mb-3">{lancList.length} lançamentos · Total: {formatCurrency(totalPrevisto)}</p>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : lancList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os lançamentos estão conciliados 🎉</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {lancList.map(l => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLanc(selectedLanc === l.id ? null : l.id)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors border',
                      selectedLanc === l.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-card border-transparent hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[l.status_calculado ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                        {l.status_calculado}
                      </Badge>
                      <span className="truncate font-medium">{l.fornecedor_razao ?? 'S/N'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{l.data_vencimento ? formatDate(l.data_vencimento) : '—'}</span>
                      <span className="font-mono font-bold text-destructive">{formatCurrency(Math.abs(l.valor))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right panel: Movimentações sem lançamento */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="font-semibold text-sm mb-3">Movimentações sem Lançamento Vinculado</h3>
            <p className="text-[10px] text-muted-foreground mb-3">{movList.length} movimentações · Total: {formatCurrency(Math.abs(totalReal))}</p>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : movList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todas as movimentações estão vinculadas 🎉</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {movList.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMov(selectedMov === m.id ? null : m.id)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors border',
                      selectedMov === m.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-card border-transparent hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-muted-foreground shrink-0">{formatDate(m.data)}</span>
                      <span className="truncate font-medium">{m.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{m.fornecedor ?? ''}</span>
                      <span className={`font-mono font-bold ${m.valor >= 0 ? 'text-consumido' : 'text-destructive'}`}>
                        {formatCurrency(Math.abs(m.valor))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground bg-muted/30 rounded-lg py-3 px-4">
        <span>Previsto pendente: <span className="font-mono font-bold text-destructive">{formatCurrency(totalPrevisto)}</span></span>
        <span>|</span>
        <span>Movimentações livres: <span className="font-mono font-bold text-foreground">{formatCurrency(Math.abs(totalReal))}</span></span>
        <span>|</span>
        <span>Diferença: <span className={`font-mono font-bold ${diferenca >= 0 ? 'text-consumido' : 'text-destructive'}`}>{formatCurrency(Math.abs(diferenca))}</span></span>
      </div>
    </div>
  );
}
