import { useState, useMemo } from 'react';
import { Check, X, FileText, Ruler, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

type ApprovalItem = {
  type: 'medicao' | 'documento';
  id: string;
  title: string;
  subtitle: string;
  etapa: string;
  valor: number;
  status: string;
  date: string;
};

export function AprovacoesTab() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pendente' | 'aprovado' | 'reprovado' | 'todos'>('pendente');
  const [rejectDialog, setRejectDialog] = useState<{ id: string; type: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: lancamentos, isLoading: loadingLanc } = useQuery({
    queryKey: ['aprovacoes-lancamentos', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, observacao, valor, data_vencimento, situacao, e_previsao, orcamento_item_id, fornecedor_id, tipo')
        .eq('company_id', companyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: documentos, isLoading: loadingDocs } = useQuery({
    queryKey: ['aprovacoes-documentos', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos')
        .select('id, nome_arquivo, status, created_at')
        .eq('company_id', companyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: grupos } = useQuery({
    queryKey: ['orcamento-grupos-map', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from('orcamento_grupos').select('id, nome').eq('company_id', companyId!).eq('ativo', true);
      return data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ['orcamento-items-map', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from('orcamento_items').select('id, item, grupo_id').eq('company_id', companyId!).eq('ativo', true);
      return data ?? [];
    },
  });

  const grupoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (grupos ?? []).forEach(g => { map[g.id] = g.nome; });
    return map;
  }, [grupos]);

  const itemGrupoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (items ?? []).forEach(i => { map[i.id] = i.grupo_id ?? ''; });
    return map;
  }, [items]);

  const approvalItems: ApprovalItem[] = useMemo(() => {
    const result: ApprovalItem[] = [];

    (lancamentos ?? []).forEach(l => {
      const grupoId = l.orcamento_item_id ? itemGrupoMap[l.orcamento_item_id] : '';
      const etapa = grupoId ? grupoMap[grupoId] ?? '—' : '—';
      result.push({
        type: 'medicao',
        id: l.id,
        title: l.observacao ?? (l.tipo === 'despesa' ? 'Despesa' : 'Receita'),
        subtitle: l.e_previsao ? 'Previsão do planejamento' : l.tipo === 'despesa' ? 'Despesa' : 'Receita',
        etapa,
        valor: l.valor,
        status: l.situacao === 'pago' ? 'aprovado' : l.situacao === 'cancelado' ? 'reprovado' : 'pendente',
        date: l.data_vencimento,
      });
    });

    (documentos ?? []).forEach(d => {
      result.push({
        type: 'documento',
        id: d.id,
        title: d.nome_arquivo,
        subtitle: 'Documento submetido',
        etapa: '—',
        valor: 0,
        status: d.status === 'aprovado' ? 'aprovado' : d.status === 'rejeitado' ? 'reprovado' : 'pendente',
        date: d.created_at ?? '',
      });
    });

    return result;
  }, [lancamentos, documentos, grupoMap, itemGrupoMap]);

  const filtered = filter === 'todos' ? approvalItems : approvalItems.filter(i => i.status === filter);

  const counts = useMemo(() => ({
    pendente: approvalItems.filter(i => i.status === 'pendente').length,
    aprovado: approvalItems.filter(i => i.status === 'aprovado').length,
    reprovado: approvalItems.filter(i => i.status === 'reprovado').length,
  }), [approvalItems]);

  const approveMut = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      if (type === 'medicao') {
        const { error } = await supabase.from('lancamentos').update({ status: 'aprovado' } as never).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('documentos').update({ status: 'aprovado' }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aprovacoes-lancamentos'] });
      qc.invalidateQueries({ queryKey: ['aprovacoes-documentos'] });
      toast.success('Item aprovado');
    },
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      if (type === 'medicao') {
        const { error } = await supabase.from('lancamentos').update({ status: 'cancelado' } as never).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('documentos').update({ status: 'rejeitado' }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aprovacoes-lancamentos'] });
      qc.invalidateQueries({ queryKey: ['aprovacoes-documentos'] });
      setRejectDialog(null);
      setRejectReason('');
      toast.success('Item reprovado');
    },
  });

  const isLoading = loadingLanc || loadingDocs;

  const statusIcon = (s: string) => {
    if (s === 'aprovado') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'reprovado') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:ring-1 ring-primary" onClick={() => setFilter('pendente')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{counts.pendente}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary" onClick={() => setFilter('aprovado')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{counts.aprovado}</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary" onClick={() => setFilter('reprovado')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{counts.reprovado}</p>
              <p className="text-xs text-muted-foreground">Reprovados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum item {filter === 'todos' ? '' : filter} encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex-shrink-0">
                {item.type === 'medicao' ? <Ruler className="h-5 w-5 text-blue-500" /> : <FileText className="h-5 w-5 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {item.type === 'medicao' ? 'Lançamento' : 'Documento'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{item.subtitle}</span>
                  <span>·</span>
                  <span>Etapa: {item.etapa}</span>
                  {item.valor > 0 && <><span>·</span><span className="font-mono">{formatCurrency(item.valor)}</span></>}
                  {item.date && <><span>·</span><span>{formatDate(item.date)}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusIcon(item.status)}
                {item.status === 'pendente' && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => approveMut.mutate({ id: item.id, type: item.type })}>
                      <Check className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => setRejectDialog({ id: item.id, type: item.type })}>
                      <X className="h-3 w-3" /> Reprovar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reprovar Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo da reprovação</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Descreva o motivo..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => rejectDialog && rejectMut.mutate(rejectDialog)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
