import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Check, X, FileText, Image, AlertTriangle, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Loader2, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClassificacaoIA {
  id: string;
  documento_id: string;
  lancamento_id: string | null;
  fornecedor_extraido: string | null;
  cnpj_extraido: string | null;
  valor_extraido: number | null;
  data_vencimento_ext: string | null;
  departamento_proposto: string | null;
  categoria_proposta: string | null;
  grupo_proposto: string | null;
  orcamento_item_id: string | null;
  score_confianca: number | null;
  justificativa_ia: string | null;
  status_auditoria: string;
}

interface ApprovalItemData {
  id: string;
  type: 'lancamento' | 'documento';
  // Lancamento fields
  lancamento_id?: string;
  observacao?: string;
  valor?: number;
  data_vencimento?: string;
  tipo?: string; // despesa | receita
  situacao?: string;
  status_aprovacao?: string;
  fornecedor_razao?: string;
  forma_pagamento?: string;
  departamento?: string;
  categoria?: string;
  // Documento fields
  documento_id?: string;
  nome_arquivo?: string;
  storage_path?: string;
  tipo_mime?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: ApprovalItemData | null;
}

export function AprovacaoReviewDialog({ open, onClose, item }: Props) {
  const { companyId } = useCompany();
  const qc = useQueryClient();

  // Fetch classification for this document
  const { data: classificacao, isLoading: loadingClass } = useQuery({
    queryKey: ['classificacao-review', item?.documento_id],
    enabled: !!item?.documento_id,
    queryFn: async (): Promise<ClassificacaoIA | null> => {
      const { data, error } = await supabase
        .from('classificacoes_ia' as never)
        .select('*' as never)
        .eq('documento_id' as never, item!.documento_id! as never)
        .maybeSingle() as unknown as { data: ClassificacaoIA | null; error: Error | null };
      if (error) throw error;
      return data;
    },
  });

  // Get signed URL for document preview
  const { data: previewUrl } = useQuery({
    queryKey: ['doc-preview-url', item?.storage_path],
    enabled: !!item?.storage_path,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(item!.storage_path!, 3600);
      if (error) return null;
      return data.signedUrl;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Editable fields
  const [tipoLanc, setTipoLanc] = useState<'despesa' | 'receita'>('despesa');
  const [fornecedor, setFornecedor] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [categoria, setCategoria] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  // Populate from classification or lancamento data
  useEffect(() => {
    if (classificacao) {
      setFornecedor(classificacao.fornecedor_extraido ?? '');
      setCnpj(classificacao.cnpj_extraido ?? '');
      setValor(String(classificacao.valor_extraido ?? ''));
      setVencimento(classificacao.data_vencimento_ext ?? '');
      setDepartamento(classificacao.departamento_proposto ?? '');
      setCategoria(classificacao.categoria_proposta ?? '');
    } else if (item) {
      setFornecedor(item.fornecedor_razao ?? '');
      setValor(String(item.valor ?? ''));
      setVencimento(item.data_vencimento ?? '');
      setDepartamento(item.departamento ?? '');
      setCategoria(item.categoria ?? '');
    }
    setTipoLanc((item?.tipo as 'despesa' | 'receita') ?? 'despesa');
    setShowReject(false);
    setRejectReason('');
  }, [classificacao, item]);

  const score = classificacao?.score_confianca;
  const scoreColor = score != null
    ? score >= 0.9 ? 'text-green-500' : score >= 0.7 ? 'text-yellow-500' : 'text-destructive'
    : '';

  // Approve mutation
  const approveMut = useMutation({
    mutationFn: async () => {
      if (!item) return;

      // If lancamento, update status_aprovacao + tipo + fields
      const lancId = item.lancamento_id ?? (classificacao?.lancamento_id);
      if (lancId) {
        const { error } = await supabase
          .from('lancamentos')
          .update({
            status_aprovacao: 'aprovado',
            tipo: tipoLanc,
            fornecedor_razao: fornecedor || null,
            fornecedor_cnpj: cnpj || null,
            valor: parseFloat(valor) || item.valor || 0,
            data_vencimento: vencimento || null,
            departamento: departamento || null,
            categoria: categoria || null,
            aprovado_em: new Date().toISOString(),
          })
          .eq('id', lancId);
        if (error) throw error;
      }

      // If documento, update status
      if (item.documento_id) {
        const { error } = await supabase
          .from('documentos')
          .update({ status: 'aprovado' })
          .eq('id', item.documento_id);
        if (error) throw error;
      }

      // If classification, update audit status
      if (classificacao) {
        const { error } = await supabase
          .from('classificacoes_ia' as never)
          .update({
            status_auditoria: 'aprovado',
            auditado_em: new Date().toISOString(),
          } as never)
          .eq('id' as never, classificacao.id as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aprovacoes-lancamentos'] });
      qc.invalidateQueries({ queryKey: ['aprovacoes-documentos'] });
      qc.invalidateQueries({ queryKey: ['classificacao-review'] });
      qc.invalidateQueries({ queryKey: ['lancamentos-aprovados'] });
      toast.success(`${tipoLanc === 'despesa' ? 'CPA' : 'CRE'} aprovado — aparecerá em ${tipoLanc === 'despesa' ? 'A Pagar' : 'A Receber'}`);
      onClose();
    },
    onError: () => toast.error('Erro ao aprovar'),
  });

  // Reject mutation
  const rejectMut = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const lancId = item.lancamento_id ?? classificacao?.lancamento_id;
      if (lancId) {
        const { error } = await supabase
          .from('lancamentos')
          .update({
            status_aprovacao: 'rejeitado',
            motivo_rejeicao: rejectReason || null,
          })
          .eq('id', lancId);
        if (error) throw error;
      }
      if (item.documento_id) {
        const { error } = await supabase
          .from('documentos')
          .update({ status: 'rejeitado' })
          .eq('id', item.documento_id);
        if (error) throw error;
      }
      if (classificacao) {
        const { error } = await supabase
          .from('classificacoes_ia' as never)
          .update({
            status_auditoria: 'rejeitado',
            motivo_rejeicao: rejectReason || null,
            auditado_em: new Date().toISOString(),
          } as never)
          .eq('id' as never, classificacao.id as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aprovacoes-lancamentos'] });
      qc.invalidateQueries({ queryKey: ['aprovacoes-documentos'] });
      qc.invalidateQueries({ queryKey: ['classificacao-review'] });
      toast.success('Item rejeitado');
      onClose();
    },
    onError: () => toast.error('Erro ao rejeitar'),
  });

  if (!item) return null;

  const isPdf = item.tipo_mime === 'application/pdf';
  const isImage = item.tipo_mime?.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Review — {item.nome_arquivo ?? item.observacao ?? 'Item'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Document Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documento</Label>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Abrir original
                </a>
              )}
            </div>
            <div className="border rounded-lg bg-muted/20 h-[400px] flex items-center justify-center overflow-hidden">
              {!previewUrl ? (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sem preview disponível</p>
                </div>
              ) : isPdf ? (
                <iframe src={previewUrl} className="w-full h-full rounded-lg" title="PDF Preview" />
              ) : isImage ? (
                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Formato: {item.tipo_mime}</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                    Baixar arquivo
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Classification fields */}
          <div className="space-y-4">
            {/* Score IA */}
            {score != null && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                <ShieldCheck className={cn('h-4 w-4', scoreColor)} />
                <span className="text-xs font-medium">Confiança IA:</span>
                <span className={cn('text-sm font-bold font-mono', scoreColor)}>
                  {(score * 100).toFixed(0)}%
                </span>
                {classificacao?.justificativa_ia && (
                  <span className="text-[10px] text-muted-foreground ml-2 truncate" title={classificacao.justificativa_ia}>
                    {classificacao.justificativa_ia}
                  </span>
                )}
              </div>
            )}

            {/* CPA / CRE Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo do Lançamento *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all',
                    tipoLanc === 'despesa'
                      ? 'border-destructive bg-destructive/5 text-destructive'
                      : 'border-border hover:border-destructive/40'
                  )}
                  onClick={() => setTipoLanc('despesa')}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  CPA · A Pagar
                </button>
                <button
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all',
                    tipoLanc === 'receita'
                      ? 'border-green-500 bg-green-500/5 text-green-600'
                      : 'border-border hover:border-green-500/40'
                  )}
                  onClick={() => setTipoLanc('receita')}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  CRE · A Receber
                </button>
              </div>
            </div>

            <Separator />

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Fornecedor / Cliente</Label>
                <Input value={fornecedor} onChange={e => setFornecedor(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} className="h-8 text-sm" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Vencimento</Label>
                <Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Input value={departamento} onChange={e => setDepartamento(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Input value={categoria} onChange={e => setCategoria(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Reject section */}
            {showReject && (
              <div className="space-y-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <Label className="text-xs text-destructive">Motivo da rejeição</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="Descreva o motivo..." />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
                    {rejectMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    Confirmar Rejeição
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="gap-2 sm:gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Badge variant="outline" className={cn('text-[10px]', tipoLanc === 'despesa' ? 'border-destructive text-destructive' : 'border-green-500 text-green-600')}>
              {tipoLanc === 'despesa' ? 'CPA · A Pagar' : 'CRE · A Receber'}
            </Badge>
            {valor && <span className="text-sm font-mono font-medium">{formatCurrency(parseFloat(valor) || 0)}</span>}
            {vencimento && <span className="text-xs text-muted-foreground">Venc: {formatDate(vencimento)}</span>}
          </div>
          {!showReject && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setShowReject(true)}>
              <X className="h-3 w-3 mr-1" /> Reprovar
            </Button>
          )}
          <Button size="sm" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
            {approveMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
            Aprovar como {tipoLanc === 'despesa' ? 'CPA' : 'CRE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
