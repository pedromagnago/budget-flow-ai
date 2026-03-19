import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface QuinzenaRow {
  grupo: string;
  grupo_id: string;
  valores: number[]; // Q1..Q10
  total: number;
}

const QUINZENAS = Array.from({ length: 10 }, (_, i) => `Q${i + 1}`);

export function FluxoQuinzenalTable() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ['fluxo-quinzenal', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      // Fetch budget groups
      const { data: grupos } = await supabase
        .from('orcamento_grupos')
        .select('id, nome, valor_total')
        .eq('company_id', companyId!)
        .eq('ativo', true)
        .order('nome');

      // Fetch items with quinzena distribution
      const { data: items } = await supabase
        .from('orcamento_items')
        .select('grupo_id, valor_orcado, quinzenas')
        .eq('company_id', companyId!)
        .eq('ativo', true);

      // Fetch receitas by quinzena
      const { data: receitas } = await supabase
        .from('lancamentos')
        .select('valor, quinzena')
        .eq('company_id', companyId!)
        .eq('tipo', 'receita')
        .eq('e_previsao', true)
        .is('deleted_at', null);

      const grupoRows: QuinzenaRow[] = (grupos ?? []).map(g => {
        const grupoItems = (items ?? []).filter(i => i.grupo_id === g.id);
        const valores = QUINZENAS.map((qKey) => {
          return grupoItems.reduce((sum, item) => {
            const dist = item.quinzenas as Record<string, number> | null;
            if (dist && dist[qKey]) {
              return sum + item.valor_orcado * (dist[qKey] / 100);
            }
            return sum;
          }, 0);
        });
        // If no distribution, spread evenly
        const hasDistrib = valores.some(v => v > 0);
        if (!hasDistrib) {
          const perQ = Number(g.valor_total) / 10;
          valores.fill(perQ);
        }
        return { grupo: g.nome, grupo_id: g.id, valores, total: valores.reduce((s, v) => s + v, 0) };
      });

      // Receitas row
      const receitaValores = QUINZENAS.map(q => {
        return (receitas ?? [])
          .filter(r => r.quinzena === q)
          .reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
      });
      const receitaTotal = receitaValores.reduce((s, v) => s + v, 0);

      // Saldo per Q
      const custosPorQ = QUINZENAS.map((_, qi) => grupoRows.reduce((s, g) => s + g.valores[qi], 0));
      const saldoValores = QUINZENAS.map((_, qi) => receitaValores[qi] - custosPorQ[qi]);

      // Saldo acumulado
      let acum = 0;
      const saldoAcumValores = saldoValores.map(v => { acum += v; return acum; });

      return { grupoRows, receitaValores, receitaTotal, saldoValores, saldoAcumValores };
    },
  });

  const exportExcel = () => {
    if (!data) return;
    const rows: (string | number)[][] = [];
    rows.push(['Grupo', ...QUINZENAS, 'Total']);
    rows.push(['RECEITAS', ...data.receitaValores, data.receitaTotal]);
    data.grupoRows.forEach(g => rows.push([g.grupo, ...g.valores, g.total]));
    rows.push(['SALDO QUINZENA', ...data.saldoValores, data.saldoValores.reduce((s, v) => s + v, 0)]);
    rows.push(['SALDO ACUMULADO', ...data.saldoAcumValores, data.saldoAcumValores[data.saldoAcumValores.length - 1] ?? 0]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fluxo Quinzenal');
    XLSX.writeFile(wb, 'fluxo_quinzenal.xlsx');
  };

  if (isLoading || !data) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  const SpecialRow = ({ label, valores, total, className }: { label: string; valores: number[]; total: number; className?: string }) => (
    <tr className={cn('border-t font-semibold', className)}>
      <td className="py-1.5 px-2 text-xs font-bold">{label}</td>
      {valores.map((v, i) => (
        <td key={i} className={cn('py-1.5 px-2 text-right font-mono text-xs', v < 0 ? 'text-destructive' : '')}>
          {formatCurrency(v)}
        </td>
      ))}
      <td className={cn('py-1.5 px-2 text-right font-mono text-xs font-bold', total < 0 ? 'text-destructive' : '')}>
        {formatCurrency(total)}
      </td>
    </tr>
  );

  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Fluxo Quinzenal por Grupo
        </p>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5 mr-2" /> Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-1.5 px-2 text-xs min-w-[160px]">Grupo</th>
              {QUINZENAS.map(q => (
                <th key={q} className="text-right py-1.5 px-2 text-xs min-w-[100px]">{q}</th>
              ))}
              <th className="text-right py-1.5 px-2 text-xs min-w-[110px]">Total</th>
            </tr>
          </thead>
          <tbody>
            <SpecialRow label="RECEITAS" valores={data.receitaValores} total={data.receitaTotal} className="bg-primary/5" />
            {data.grupoRows.map(g => (
              <tr key={g.grupo_id} className="border-t hover:bg-muted/30">
                <td className="py-1.5 px-2 text-xs">{g.grupo.length > 25 ? g.grupo.substring(0, 23) + '…' : g.grupo}</td>
                {g.valores.map((v, i) => (
                  <td key={i} className="py-1.5 px-2 text-right font-mono text-xs">{formatCurrency(v)}</td>
                ))}
                <td className="py-1.5 px-2 text-right font-mono text-xs font-medium">{formatCurrency(g.total)}</td>
              </tr>
            ))}
            <SpecialRow
              label="SALDO QUINZENA"
              valores={data.saldoValores}
              total={data.saldoValores.reduce((s, v) => s + v, 0)}
              className="bg-muted/30"
            />
            <SpecialRow
              label="SALDO ACUMULADO"
              valores={data.saldoAcumValores}
              total={data.saldoAcumValores[data.saldoAcumValores.length - 1] ?? 0}
              className="bg-muted/50"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
