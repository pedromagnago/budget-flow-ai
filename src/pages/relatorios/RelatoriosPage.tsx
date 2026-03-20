import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { OrcadoRealizadoFisicoTab } from '@/components/relatorios/OrcadoRealizadoFisicoTab';
import { DesempenhoEvmTab } from '@/components/relatorios/DesempenhoEvmTab';
import * as XLSX from 'xlsx';

export default function RelatoriosPage() {
  const [tab, setTab] = useState('orcado-fisico');
  const { companyId } = useCompany();

  // Fluxo de Caixa
  const { data: fluxoData } = useQuery({
    queryKey: ['relatorio-fluxo', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('movimentacoes_bancarias')
        .select('data, valor, tipo')
        .eq('company_id', companyId!)
        .order('data');
      if (!data) return [];
      const byDate = new Map<string, { entradas: number; saidas: number }>();
      data.forEach(m => {
        const d = m.data;
        const cur = byDate.get(d) ?? { entradas: 0, saidas: 0 };
        if (Number(m.valor) > 0) cur.entradas += Number(m.valor);
        else cur.saidas += Math.abs(Number(m.valor));
        byDate.set(d, cur);
      });
      let acum = 0;
      return Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, { entradas, saidas }]) => {
          const saldo = entradas - saidas;
          acum += saldo;
          return { data, entradas, saidas, saldo, saldoAcumulado: acum };
        });
    },
  });

  // Contas a Pagar/Receber
  const { data: contasData } = useQuery({
    queryKey: ['relatorio-contas', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vw_lancamentos_status')
        .select('id, data_vencimento, fornecedor_razao, departamento, valor, valor_pago, status_calculado, tipo')
        .eq('company_id', companyId!)
        .is('deleted_at', null)
        .order('data_vencimento');
      return (data ?? []).map(r => ({
        ...r,
        valor: Math.abs(Number(r.valor ?? 0)),
        valor_pago: Math.abs(Number(r.valor_pago ?? 0)),
        diferenca: Math.abs(Number(r.valor ?? 0)) - Math.abs(Number(r.valor_pago ?? 0)),
      }));
    },
  });

  const exportFluxoXlsx = () => {
    if (!fluxoData) return;
    const rows = [['Data', 'Entradas', 'Saídas', 'Saldo Dia', 'Saldo Acumulado']];
    fluxoData.forEach(r => rows.push([r.data, r.entradas as any, r.saidas as any, r.saldo as any, r.saldoAcumulado as any]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');
    XLSX.writeFile(wb, 'fluxo_caixa.xlsx');
  };

  const exportContasXlsx = () => {
    if (!contasData) return;
    const rows = [['Vencimento', 'Fornecedor', 'Grupo', 'Tipo', 'Valor', 'Pago', 'Diferença', 'Status']];
    contasData.forEach(r => rows.push([
      r.data_vencimento ?? '', r.fornecedor_razao ?? '', r.departamento ?? '', r.tipo ?? '',
      r.valor as any, r.valor_pago as any, r.diferenca as any, r.status_calculado ?? '',
    ]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contas');
    XLSX.writeFile(wb, 'contas_pagar_receber.xlsx');
  };

  const statusColor = (s: string | null) => {
    if (s === 'pago') return 'text-green-600';
    if (s === 'atrasado') return 'text-destructive';
    if (s === 'vence_em_breve') return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="orcado-fisico">Orçado × Realizado × Físico</TabsTrigger>
          <TabsTrigger value="evm">Desempenho (EVM)</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="contas">Contas a Pagar/Receber</TabsTrigger>
        </TabsList>

        <TabsContent value="orcado-fisico">
          <OrcadoRealizadoFisicoTab />
        </TabsContent>

        <TabsContent value="evm">
          <DesempenhoEvmTab />
        </TabsContent>

        <TabsContent value="fluxo">
          <div className="bg-card border rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Fluxo de Caixa — Movimentações por Data</p>
              <Button variant="outline" size="sm" onClick={exportFluxoXlsx}>
                <Download className="h-3.5 w-3.5 mr-2" /> Excel
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs">Data</th>
                    <th className="text-right py-2 px-3 text-xs">Entradas</th>
                    <th className="text-right py-2 px-3 text-xs">Saídas</th>
                    <th className="text-right py-2 px-3 text-xs">Saldo Dia</th>
                    <th className="text-right py-2 px-3 text-xs">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {(fluxoData ?? []).map(r => (
                    <tr key={r.data} className="border-t hover:bg-muted/30">
                      <td className="py-1.5 px-3 text-xs font-mono">{formatDate(r.data)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs text-green-600">{formatCurrency(r.entradas)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs text-destructive">{formatCurrency(r.saidas)}</td>
                      <td className={cn('py-1.5 px-3 text-right font-mono text-xs', r.saldo < 0 ? 'text-destructive' : '')}>
                        {formatCurrency(r.saldo)}
                      </td>
                      <td className={cn('py-1.5 px-3 text-right font-mono text-xs font-medium', r.saldoAcumulado < 0 ? 'text-destructive' : '')}>
                        {formatCurrency(r.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                  {(fluxoData ?? []).length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">Sem dados de movimentações</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contas">
          <div className="bg-card border rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Contas a Pagar e Receber</p>
              <Button variant="outline" size="sm" onClick={exportContasXlsx}>
                <Download className="h-3.5 w-3.5 mr-2" /> Excel
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs">Vencimento</th>
                    <th className="text-left py-2 px-3 text-xs">Fornecedor</th>
                    <th className="text-left py-2 px-3 text-xs">Grupo</th>
                    <th className="text-left py-2 px-3 text-xs">Tipo</th>
                    <th className="text-right py-2 px-3 text-xs">Valor</th>
                    <th className="text-right py-2 px-3 text-xs">Pago</th>
                    <th className="text-right py-2 px-3 text-xs">Diferença</th>
                    <th className="text-center py-2 px-3 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(contasData ?? []).map(r => (
                    <tr key={r.id} className={cn('border-t hover:bg-muted/30', r.status_calculado === 'atrasado' && 'bg-destructive/5')}>
                      <td className="py-1.5 px-3 text-xs font-mono">{r.data_vencimento ? formatDate(r.data_vencimento) : '—'}</td>
                      <td className="py-1.5 px-3 text-xs">{r.fornecedor_razao ?? '—'}</td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground">{r.departamento ?? '—'}</td>
                      <td className="py-1.5 px-3 text-xs">{r.tipo === 'receita' ? 'Receber' : 'Pagar'}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{formatCurrency(r.valor)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{formatCurrency(r.valor_pago)}</td>
                      <td className={cn('py-1.5 px-3 text-right font-mono text-xs', r.diferenca > 0 ? 'text-destructive' : 'text-green-600')}>
                        {formatCurrency(r.diferenca)}
                      </td>
                      <td className={cn('py-1.5 px-3 text-center text-xs font-medium', statusColor(r.status_calculado))}>
                        {r.status_calculado ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {(contasData ?? []).length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
