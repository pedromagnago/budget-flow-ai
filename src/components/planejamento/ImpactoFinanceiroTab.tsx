import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Check, Eye, XCircle } from 'lucide-react';
import { useImpactos, useResolveImpacto } from '@/hooks/usePlanejamento';
import { useServicosSituacao } from '@/hooks/usePlanejamento';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

const TIPO_LABELS: Record<string, string> = {
  desvio_fisico: 'Desvio Físico',
  medicao_liberada: 'Medição Liberada',
  atraso_servico: 'Atraso Serviço',
};

export function ImpactoFinanceiroTab() {
  const { data: pendentes } = useImpactos(false);
  const { data: historico } = useImpactos(true);
  const { data: servicosSituacao } = useServicosSituacao();
  const resolveMut = useResolveImpacto();
  const [historicoFilter, setHistoricoFilter] = useState('todos');

  const atrasados = (servicosSituacao ?? []).filter(s => s.situacao_calculada === 'atrasado');

  async function handleResolve(id: string, acao: string) {
    try {
      await resolveMut.mutateAsync({ id, acao });
      toast.success('Impacto resolvido');
    } catch {
      toast.error('Erro ao resolver');
    }
  }

  const filteredHistorico = (historico ?? []).filter(h =>
    historicoFilter === 'todos' || h.tipo === historicoFilter
  );

  return (
    <div className="space-y-6">
      {/* Desvios ativos */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-sm">Desvios Ativos</h3>
            <Badge variant="outline" className="ml-auto text-xs">{(pendentes ?? []).length} pendentes</Badge>
          </div>

          {(pendentes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum desvio pendente 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                  <TableHead className="text-right">Impacto R$</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pendentes ?? []).map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[imp.tipo] ?? imp.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{imp.descricao ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {imp.desvio_dias != null ? `${imp.desvio_dias}d` : imp.desvio_percentual != null ? `${imp.desvio_percentual}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-destructive">
                      {imp.impacto_financeiro ? formatCurrency(imp.impacto_financeiro) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-consumido" title="Resolver" onClick={() => handleResolve(imp.id, 'resolvido')}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-module-dashboard" title="Gerar alerta" onClick={() => handleResolve(imp.id, 'alerta_gerado')}>
                          <AlertTriangle className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" title="Ignorar" onClick={() => handleResolve(imp.id, 'ignorado')}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Serviços atrasados com impacto */}
      {atrasados.length > 0 && (
        <Card className="border-destructive/20">
          <CardContent className="pt-5 pb-4">
            <h3 className="font-semibold text-sm mb-3">Serviços com Atraso</h3>
            <div className="space-y-2">
              {atrasados.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-destructive/5 rounded-lg px-3 py-2">
                  <span className="font-medium text-xs">{s.nome}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-[10px]">{s.dias_atraso}d atraso</Badge>
                    <span className="text-xs font-mono text-muted-foreground">{formatCurrency(s.valor_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Histórico de Impactos</h3>
            <Select value={historicoFilter} onValueChange={setHistoricoFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="desvio_fisico">Desvio Físico</SelectItem>
                <SelectItem value="medicao_liberada">Medição Liberada</SelectItem>
                <SelectItem value="atraso_servico">Atraso Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredHistorico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro no histórico</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="text-right">Impacto</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorico.slice(0, 20).map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[imp.tipo] ?? imp.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{imp.descricao ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{imp.acao_tomada}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {imp.impacto_financeiro ? formatCurrency(imp.impacto_financeiro) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(imp.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
