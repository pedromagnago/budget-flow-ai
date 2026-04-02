import { useState, useMemo } from 'react';
import { Check, X, FileText, Ruler, Clock, CheckCircle, XCircle, AlertTriangle, Eye, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { AprovacaoReviewDialog } from './AprovacaoReviewDialog';
import { cn } from '@/lib/utils';

type ApprovalItem = {
  type: 'lancamento' | 'documento';
  id: string;
  lancamento_id?: string;
  documento_id?: string;
  title: string;
  subtitle: string;
  etapa: string;
  valor: number;
  status: string;
  tipoLanc: string;
  date: string;
  nome_arquivo?: string;
  storage_path?: string;
  tipo_mime?: string;
  observacao?: string;
  fornecedor_razao?: string;
  forma_pagamento?: string;
  departamento?: string;
  categoria?: string;
  data_vencimento?: string;
};

export function AprovacoesTab() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'todos'>('pendente');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'despesa' | 'receita'>('todos');
  const [reviewItem, setReviewItem] = useState<ApprovalItem | null>(null);

  const { data: lancamentos, isLoading: loadingLanc } = useQuery({
    queryKey: ['aprovacoes-lancamentos', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, observacao, valor, data_vencimento, situacao, e_previsao, orcamento_item_id, fornecedor_id, tipo, status_aprovacao, fornecedor_razao, forma_pagamento, departamento, categoria')
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
        .select('id, nome_arquivo, status, created_at, storage_path, tipo_mime')
        .eq('company_id', companyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Join classificacoes_ia to documentos for lancamento_id
  const { data: classificacoes } = useQuery({
    queryKey: ['aprovacoes-classificacoes', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classificacoes_ia' as never)
        .select('documento_id, lancamento_id, fornecedor_extraido, valor_extraido, data_vencimento_ext, status_auditoria' as never)
        .eq('company_id' as never, companyId! as never) as unknown as {
          data: Array<{
            documento_id: string;
            lancamento_id: string | null;
            fornecedor_extraido: string | null;
            valor_extraido: number | null;
            data_vencimento_ext: string | null;
            status_auditoria: string;
          }> | null;
          error: Error | null;
        };
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

  const classMap = useMemo(() => {
    const map: Record<string, typeof classificacoes extends Array<infer T> ? T : never> = {};
    (classificacoes ?? []).forEach(c => { map[c.documento_id] = c; });
    return map;
  }, [classificacoes]);

  const approvalItems: ApprovalItem[] = useMemo(() => {
    const result: ApprovalItem[] = [];

    (lancamentos ?? []).forEach(l => {
      const grupoId = l.orcamento_item_id ? itemGrupoMap[l.orcamento_item_id] : '';
      const etapa = grupoId ? grupoMap[grupoId] ?? '—' : '—';
      const status = l.status_aprovacao === 'aprovado' ? 'aprovado'
        : l.status_aprovacao === 'rejeitado' ? 'rejeitado'
        : 'pendente';
      result.push({
        type: 'lancamento',
        id: l.id,
        lancamento_id: l.id,
        title: l.observacao ?? (l.tipo === 'despesa' ? 'Despesa' : 'Receita'),
        subtitle: l.e_previsao ? 'Previsão' : l.tipo === 'despesa' ? 'Despesa' : 'Receita',
        etapa,
        valor: l.valor,
        status,
        tipoLanc: l.tipo ?? 'despesa',
        date: l.data_vencimento,
        observacao: l.observacao,
        fornecedor_razao: l.fornecedor_razao,
        forma_pagamento: l.forma_pagamento,
        departamento: l.departamento,
        categoria: l.categoria,
        data_vencimento: l.data_vencimento,
      });
    });

    (documentos ?? []).forEach(d => {
      const cls = classMap[d.id];
      const auditStatus = cls?.status_auditoria;
      const status = auditStatus === 'aprovado' || d.status === 'aprovado' ? 'aprovado'
        : auditStatus === 'rejeitado' || d.status === 'rejeitado' ? 'rejeitado'
        : 'pendente';
      result.push({
        type: 'documento',
        id: d.id,
        documento_id: d.id,
        lancamento_id: cls?.lancamento_id ?? undefined,
        title: d.nome_arquivo,
        subtitle: cls?.fornecedor_extraido ?? 'Documento submetido',
        etapa: '—',
        valor: cls?.valor_extraido ?? 0,
        status,
        tipoLanc: 'despesa',
        date: cls?.data_vencimento_ext ?? d.created_at ?? '',
        nome_arquivo: d.nome_arquivo,
        storage_path: d.storage_path,
        tipo_mime: d.tipo_mime,
        data_vencimento: cls?.data_vencimento_ext ?? undefined,
      });
    });

    return result.sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (b.status === 'pendente' && a.status !== 'pendente') return 1;
      return 0;
    });
  }, [lancamentos, documentos, grupoMap, itemGrupoMap, classMap]);

  const filtered = useMemo(() => {
    let list = filter === 'todos' ? approvalItems : approvalItems.filter(i => i.status === filter);
    if (tipoFilter !== 'todos') list = list.filter(i => i.tipoLanc === tipoFilter);
    return list;
  }, [approvalItems, filter, tipoFilter]);

  const counts = useMemo(() => ({
    pendente: approvalItems.filter(i => i.status === 'pendente').length,
    aprovado: approvalItems.filter(i => i.status === 'aprovado').length,
    rejeitado: approvalItems.filter(i => i.status === 'rejeitado').length,
  }), [approvalItems]);

  const isLoading = loadingLanc || loadingDocs;

  const statusIcon = (s: string) => {
    if (s === 'aprovado') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'rejeitado') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={cn('cursor-pointer hover:ring-1 ring-primary transition-all', filter === 'pendente' && 'ring-1')} onClick={() => setFilter('pendente')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{counts.pendente}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('cursor-pointer hover:ring-1 ring-primary transition-all', filter === 'aprovado' && 'ring-1')} onClick={() => setFilter('aprovado')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{counts.aprovado}</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('cursor-pointer hover:ring-1 ring-primary transition-all', filter === 'rejeitado' && 'ring-1')} onClick={() => setFilter('rejeitado')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{counts.rejeitado}</p>
              <p className="text-xs text-muted-foreground">Rejeitados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipo filter */}
      <div className="flex gap-2">
        {(['todos', 'despesa', 'receita'] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={tipoFilter === t ? 'default' : 'outline'}
            className="h-7 text-xs gap-1.5"
            onClick={() => setTipoFilter(t)}
          >
            {t === 'despesa' && <ArrowDownCircle className="h-3 w-3" />}
            {t === 'receita' && <ArrowUpCircle className="h-3 w-3" />}
            {t === 'todos' ? 'Todos' : t === 'despesa' ? 'CPA · A Pagar' : 'CRE · A Receber'}
          </Button>
        ))}
      </div>

      {/* List */}
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
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => setReviewItem(item)}
            >
              <div className="flex-shrink-0">
                {item.type === 'lancamento' ? <Ruler className="h-5 w-5 text-blue-500" /> : <FileText className="h-5 w-5 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {item.type === 'lancamento' ? 'Lançamento' : 'Documento'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] flex-shrink-0',
                      item.tipoLanc === 'despesa' ? 'border-destructive/40 text-destructive' : 'border-green-500/40 text-green-600'
                    )}
                  >
                    {item.tipoLanc === 'despesa' ? 'CPA' : 'CRE'}
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
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-3 w-3" /> Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <AprovacaoReviewDialog
        open={!!reviewItem}
        onClose={() => setReviewItem(null)}
        item={reviewItem ? {
          id: reviewItem.id,
          type: reviewItem.type,
          lancamento_id: reviewItem.lancamento_id,
          documento_id: reviewItem.documento_id,
          nome_arquivo: reviewItem.nome_arquivo,
          storage_path: reviewItem.storage_path,
          tipo_mime: reviewItem.tipo_mime,
          observacao: reviewItem.observacao,
          valor: reviewItem.valor,
          data_vencimento: reviewItem.data_vencimento,
          tipo: reviewItem.tipoLanc,
          fornecedor_razao: reviewItem.fornecedor_razao,
          forma_pagamento: reviewItem.forma_pagamento,
          departamento: reviewItem.departamento,
          categoria: reviewItem.categoria,
        } : null}
      />
    </div>
  );
}
