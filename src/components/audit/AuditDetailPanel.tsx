import { useState } from 'react';
import { ArrowLeft, Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAuditApprove, useAuditReject, useAuditCorrect, type ClassificacaoIA } from '@/hooks/useAuditQueue';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  item: ClassificacaoIA;
  onBack: () => void;
}

export function AuditDetailPanel({ item, onBack }: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [corrections, setCorrections] = useState({
    departamento_proposto: item.departamento_proposto ?? '',
    categoria_proposta: item.categoria_proposta ?? '',
    valor_extraido: item.valor_extraido ?? 0,
  });

  const approveMut = useAuditApprove();
  const rejectMut = useAuditReject();
  const correctMut = useAuditCorrect();

  const isPending = item.status_auditoria === 'pendente';

  const handleApprove = () => {
    approveMut.mutate(item.id, {
      onSuccess: () => {
        toast.success('Classificação aprovada');
        onBack();
      },
      onError: () => toast.error('Erro ao aprovar'),
    });
  };

  const handleReject = () => {
    if (!motivo.trim()) {
      toast.error('Motivo de rejeição é obrigatório');
      return;
    }
    rejectMut.mutate(
      { id: item.id, motivo },
      {
        onSuccess: () => {
          toast.success('Classificação rejeitada');
          setRejectOpen(false);
          onBack();
        },
        onError: () => toast.error('Erro ao rejeitar'),
      }
    );
  };

  const handleCorrect = () => {
    correctMut.mutate(
      { id: item.id, correcoes: corrections },
      {
        onSuccess: () => {
          toast.success('Classificação corrigida e aprovada');
          setCorrectOpen(false);
          onBack();
        },
        onError: () => toast.error('Erro ao corrigir'),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tighter">Revisão de Classificação</h1>
        <StatusBadge status={item.status_auditoria} />
      </div>

      {/* Split view */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left — Document preview */}
        <div className="bg-card border rounded-xl p-5 shadow-card space-y-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Documento Original
          </p>
          <div className="bg-muted rounded-lg h-[320px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-medium">Preview do documento</p>
              <p className="text-xs mt-1">ID: {item.documento_id.slice(0, 8)}…</p>
              <p className="text-[10px] mt-2">(Preview requer Supabase Storage configurado)</p>
            </div>
          </div>

          {/* Extracted items */}
          {item.itens_extraidos && Array.isArray(item.itens_extraidos) && item.itens_extraidos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Itens Extraídos
              </p>
              <div className="space-y-1">
                {item.itens_extraidos.map((it, i) => (
                  <div key={i} className="text-xs bg-muted/50 rounded px-2 py-1 font-mono">
                    {JSON.stringify(it)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — AI proposal */}
        <div className="bg-card border rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Proposta da IA
            </p>
            <ScoreBadge score={item.score_confianca ?? 0} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoField label="Fornecedor" value={item.fornecedor_extraido} />
            <InfoField label="CNPJ" value={item.cnpj_extraido} mono />
            <InfoField label="Valor" value={item.valor_extraido ? formatCurrency(item.valor_extraido) : null} mono />
            <InfoField label="Vencimento" value={item.data_vencimento_ext ? formatDate(item.data_vencimento_ext) : null} />
            <InfoField label="Departamento" value={item.departamento_proposto} />
            <InfoField label="Categoria" value={item.categoria_proposta} />
            <InfoField label="Grupo" value={item.grupo_proposto} />
            <InfoField label="Data Upload" value={formatDate(item.created_at)} />
          </div>

          {/* Budget impact */}
          <div className="border-t pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Impacto no Orçamento
            </p>
            <div className="grid grid-cols-2 gap-2">
              <InfoField label="Valor Orçado (Item)" value={item.valor_orcado_item ? formatCurrency(item.valor_orcado_item) : '—'} mono />
              <InfoField label="Já Consumido" value={item.valor_ja_consumido ? formatCurrency(item.valor_ja_consumido) : '—'} mono />
              <InfoField label="Saldo Antes" value={item.valor_saldo_antes ? formatCurrency(item.valor_saldo_antes) : '—'} mono />
              <InfoField
                label="Saldo Depois"
                value={item.valor_saldo_depois ? formatCurrency(item.valor_saldo_depois) : '—'}
                mono
                highlight={item.valor_saldo_depois !== null && item.valor_saldo_depois < 0}
              />
            </div>
          </div>

          {/* AI justification */}
          {item.justificativa_ia && (
            <div className="border-t pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Justificativa da IA
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.justificativa_ia}</p>
            </div>
          )}

          {/* Rejection reason (if rejected) */}
          {item.motivo_rejeicao && (
            <div className="border-t pt-3">
              <p className="text-[10px] uppercase tracking-wider text-destructive font-semibold mb-1">
                Motivo da Rejeição
              </p>
              <p className="text-xs text-destructive/80">{item.motivo_rejeicao}</p>
            </div>
          )}

          {/* Actions */}
          {isPending && (
            <div className="border-t pt-4 flex gap-2">
              <Button
                size="sm"
                className="bg-consumido hover:bg-consumido/90 text-white"
                onClick={handleApprove}
                disabled={approveMut.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-module-dashboard text-module-dashboard hover:bg-module-dashboard/10"
                onClick={() => setCorrectOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Corrigir
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Classificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Motivo da rejeição (obrigatório)</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Explique por que esta classificação está incorreta..."
              className="min-h-[100px] text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={rejectMut.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correct Dialog */}
      <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Classificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Input
                value={corrections.departamento_proposto}
                onChange={e => setCorrections(c => ({ ...c, departamento_proposto: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input
                value={corrections.categoria_proposta}
                onChange={e => setCorrections(c => ({ ...c, categoria_proposta: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                value={corrections.valor_extraido}
                onChange={e => setCorrections(c => ({ ...c, valor_extraido: parseFloat(e.target.value) || 0 }))}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCorrectOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCorrect} disabled={correctMut.isPending}>
              Corrigir e Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoField({ label, value, mono, highlight }: { label: string; value: string | null | undefined; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono tabular-nums' : ''} ${highlight ? 'text-destructive font-bold' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}
