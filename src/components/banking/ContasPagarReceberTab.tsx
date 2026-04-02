import { useState, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Calendar, Building2, CreditCard, Search, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';

type LancamentoAprovado = {
  id: string;
  tipo: string;
  observacao: string | null;
  valor: number;
  valor_pago: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  situacao: string | null;
  fornecedor_razao: string | null;
  forma_pagamento: string | null;
  departamento: string | null;
  categoria: string | null;
  parcela: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
};

export function ContasPagarReceberTab() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pagar' | 'receber'>('pagar');
  const [search, setSearch] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<'todos' | 'aberto' | 'pago'>('aberto');

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['lancamentos-aprovados', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, tipo, observacao, valor, valor_pago, data_vencimento, data_pagamento, situacao, fornecedor_razao, forma_pagamento, departamento, categoria, parcela, numero_parcela, total_parcelas')
        .eq('company_id', companyId!)
        .eq('status_aprovacao', 'aprovado')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as LancamentoAprovado[];
    },
  });

  const filtered = useMemo(() => {
    const tipoTarget = tab === 'pagar' ? 'despesa' : 'receita';
    let list = (lancamentos ?? []).filter(l => l.tipo === tipoTarget);

    if (situacaoFilter === 'aberto') {
      list = list.filter(l => l.situacao !== 'pago');
    } else if (situacaoFilter === 'pago') {
      list = list.filter(l => l.situacao === 'pago');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.fornecedor_razao ?? '').toLowerCase().includes(q) ||
        (l.observacao ?? '').toLowerCase().includes(q) ||
        (l.categoria ?? '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const da = a.data_vencimento ?? '';
      const db = b.data_vencimento ?? '';
      return da.localeCompare(db);
    });
  }, [lancamentos, tab, search, situacaoFilter]);

  const totals = useMemo(() => {
    const tipoTarget = tab === 'pagar' ? 'despesa' : 'receita';
    const all = (lancamentos ?? []).filter(l => l.tipo === tipoTarget);
    const open = all.filter(l => l.situacao !== 'pago');
    const paid = all.filter(l => l.situacao === 'pago');
    return {
      total: all.reduce((s, l) => s + l.valor, 0),
      aberto: open.reduce((s, l) => s + l.valor, 0),
      pago: paid.reduce((s, l) => s + (l.valor_pago ?? l.valor), 0),
      qtdAberto: open.length,
      qtdPago: paid.length,
    };
  }, [lancamentos, tab]);

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          situacao: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-aprovados'] });
      toast.success('Marcado como pago');
    },
  });

  const isOverdue = (venc: string | null) => {
    if (!venc) return false;
    return new Date(venc) < new Date(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all',
            tab === 'pagar'
              ? 'border-destructive bg-destructive/5 text-destructive'
              : 'border-border hover:border-destructive/40'
          )}
          onClick={() => setTab('pagar')}
        >
          <ArrowDownCircle className="h-5 w-5" />
          A Pagar (CPA)
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all',
            tab === 'receber'
              ? 'border-green-500 bg-green-500/5 text-green-600'
              : 'border-border hover:border-green-500/40'
          )}
          onClick={() => setTab('receber')}
        >
          <ArrowUpCircle className="h-5 w-5" />
          A Receber (CRE)
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">{tab === 'pagar' ? 'Total a Pagar' : 'Total a Receber'}</p>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.aberto)}</p>
            <p className="text-[10px] text-muted-foreground">{totals.qtdAberto} lançamento(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">{tab === 'pagar' ? 'Já Pago' : 'Já Recebido'}</p>
            <p className="text-xl font-bold font-mono text-green-600">{formatCurrency(totals.pago)}</p>
            <p className="text-[10px] text-muted-foreground">{totals.qtdPago} lançamento(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Geral</p>
            <p className="text-xl font-bold font-mono">{formatCurrency(totals.total)}</p>
            <p className="text-[10px] text-muted-foreground">{totals.qtdAberto + totals.qtdPago} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por fornecedor, descrição..." className="pl-9 h-8 text-sm" />
        </div>
        {(['todos', 'aberto', 'pago'] as const).map(s => (
          <Button
            key={s}
            size="sm"
            variant={situacaoFilter === s ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => setSituacaoFilter(s)}
          >
            {s === 'todos' ? 'Todos' : s === 'aberto' ? 'Em aberto' : 'Pagos'}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum lançamento {tab === 'pagar' ? 'a pagar' : 'a receber'} encontrado.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-xs">Fornecedor / Descrição</th>
                <th className="text-left p-2 font-medium text-xs">Categoria</th>
                <th className="text-right p-2 font-medium text-xs">Valor</th>
                <th className="text-left p-2 font-medium text-xs">Vencimento</th>
                <th className="text-left p-2 font-medium text-xs">Pagamento</th>
                <th className="text-center p-2 font-medium text-xs">Situação</th>
                <th className="text-right p-2 font-medium text-xs">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(l => {
                const overdue = isOverdue(l.data_vencimento) && l.situacao !== 'pago';
                return (
                  <tr key={l.id} className={cn('hover:bg-muted/20', overdue && 'bg-destructive/5')}>
                    <td className="p-2">
                      <p className="font-medium truncate max-w-[200px]">{l.fornecedor_razao ?? l.observacao ?? '—'}</p>
                      {l.numero_parcela && l.total_parcelas && l.total_parcelas > 1 && (
                        <span className="text-[10px] text-muted-foreground">Parcela {l.numero_parcela}/{l.total_parcelas}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className="text-xs text-muted-foreground">{l.categoria || l.departamento || '—'}</span>
                    </td>
                    <td className="p-2 text-right font-mono font-medium">{formatCurrency(l.valor)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        {overdue && <AlertTriangleIcon className="h-3 w-3 text-destructive" />}
                        <span className={cn('text-xs', overdue && 'text-destructive font-medium')}>
                          {l.data_vencimento ? formatDate(l.data_vencimento) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {l.forma_pagamento || '—'}
                    </td>
                    <td className="p-2 text-center">
                      {l.situacao === 'pago' ? (
                        <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" /> Pago
                        </Badge>
                      ) : overdue ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <Clock className="h-3 w-3 mr-1" /> Vencido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          <Clock className="h-3 w-3 mr-1" /> Aberto
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {l.situacao !== 'pago' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => markAsPaid.mutate(l.id)}
                          disabled={markAsPaid.isPending}
                        >
                          <Check className="h-3 w-3" />
                          {tab === 'pagar' ? 'Pagar' : 'Receber'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Small helper since we reuse icon inline
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}
