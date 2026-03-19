import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useLancamentosStatus, useConvertPrevisao } from '@/hooks/useFinanceiro';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const QUINZENAS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'];

export function PlanejamentoTab() {
  const { data: despesas = [] } = useLancamentosStatus('despesa', true);
  const { data: receitas = [] } = useLancamentosStatus('receita', true);
  const convertMut = useConvertPrevisao();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const all = useMemo(() => [...despesas, ...receitas], [despesas, receitas]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof all> = {};
    QUINZENAS.forEach(q => { map[q] = []; });
    map['Sem quinzena'] = [];
    all.forEach(l => {
      const q = l.quinzena ?? 'Sem quinzena';
      if (!map[q]) map[q] = [];
      map[q].push(l);
    });
    return map;
  }, [all]);

  const toggle = (q: string) => setCollapsed(p => ({ ...p, [q]: !p[q] }));

  const handleConvert = async (id: string) => {
    try {
      await convertMut.mutateAsync(id);
      toast.success('Convertido em lançamento real');
    } catch {
      toast.error('Erro ao converter');
    }
  };

  let saldoAcumulado = 0;

  return (
    <div className="space-y-2">
      {QUINZENAS.concat('Sem quinzena').map(q => {
        const items = grouped[q] ?? [];
        if (items.length === 0) return null;
        const entradas = items.filter(l => l.tipo === 'receita').reduce((s, l) => s + Math.abs(l.valor), 0);
        const saidas = items.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Math.abs(l.valor), 0);
        const saldo = entradas - saidas;
        saldoAcumulado += saldo;
        const isOpen = !collapsed[q];

        return (
          <div key={q} className="rounded-lg border bg-card overflow-hidden">
            <button
              onClick={() => toggle(q)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-semibold text-sm">{q}</span>
              <span className="text-xs text-muted-foreground ml-auto">{items.length} previsões</span>
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                Saldo: <span className={cn('ml-1', saldo >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatCurrency(saldo)}</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                Acum: <span className={cn('ml-1', saldoAcumulado >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatCurrency(saldoAcumulado)}</span>
              </Badge>
            </button>
            {isOpen && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', l.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>
                          {l.tipo === 'receita' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.data_vencimento ? format(new Date(l.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{l.fornecedor_razao ?? '—'}</TableCell>
                      <TableCell className="text-xs">{l.departamento_limpo ?? l.departamento ?? '—'}</TableCell>
                      <TableCell className={cn('text-right font-mono tabular-nums text-sm', l.tipo === 'receita' ? 'text-emerald-600' : 'text-destructive')}>
                        {l.tipo === 'receita' ? '+' : '−'} {formatCurrency(l.valor)}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Converter em lançamento real" onClick={() => handleConvert(l.id)}>
                          <ArrowRightCircle className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
      {all.length === 0 && (
        <div className="text-center text-muted-foreground py-12">Nenhuma previsão cadastrada</div>
      )}
    </div>
  );
}
