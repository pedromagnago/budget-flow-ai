import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Calendar, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { ItemRow } from './ItemRow';
import { AddItemDialog } from './AddItemDialog';
import type { ServicoComItens } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  servico: ServicoComItens;
  grupoId: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  futuro: { label: 'Futuro', color: 'bg-muted text-muted-foreground' },
  nao_iniciado: { label: 'Não iniciado', color: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-500/10 text-blue-600' },
  concluido: { label: 'Concluído', color: 'bg-consumido/10 text-consumido' },
  atrasado: { label: 'Atrasado', color: 'bg-destructive/10 text-destructive' },
};

export function ServicoAccordion({ servico, grupoId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const totalItens = servico.soma_itens_orcado;
  const statusInfo = STATUS_LABELS[servico.status ?? 'futuro'] ?? STATUS_LABELS.futuro;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card/50">
      {/* Header */}
      <button
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/20 transition-colors group"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        }

        <Wrench className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{servico.servico_nome}</span>
            {servico.codigo && (
              <Badge variant="outline" className="text-[9px] h-4 font-mono">{servico.codigo}</Badge>
            )}
            <Badge className={cn('text-[9px] h-4', statusInfo.color)}>{statusInfo.label}</Badge>
          </div>

          <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
            {servico.data_inicio_plan && (
              <span className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(servico.data_inicio_plan)} → {formatDate(servico.data_fim_plan)}
              </span>
            )}
            {servico.responsavel && (
              <span className="flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                {servico.responsavel}
              </span>
            )}
            <span>{servico.total_itens} ite{servico.total_itens === 1 ? 'm' : 'ns'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Total Itens</p>
            <p className="text-sm font-mono font-medium">{formatCurrency(totalItens)}</p>
          </div>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t bg-muted/10 px-4 py-3 space-y-2">
          {/* Column headers */}
          {servico.itens.length > 0 && (
            <div className="grid grid-cols-[1fr_80px_100px_120px_140px_140px_60px] gap-2 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>Item</span>
              <span className="text-right">Qtd</span>
              <span className="text-right">Vlr Unit.</span>
              <span className="text-right">Total</span>
              <span>Fornecedor</span>
              <span>Forma Pgto</span>
              <span />
            </div>
          )}

          {/* Item rows */}
          {servico.itens.map(item => (
            <ItemRow key={item.id} item={item} />
          ))}

          {servico.itens.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
              Nenhum item cadastrado neste serviço. Clique abaixo para adicionar.
            </p>
          )}

          {/* Add item button */}
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddItem(true)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Item
            </Button>
          </div>
        </div>
      )}

      <AddItemDialog
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        grupoId={grupoId}
        servicoId={servico.servico_id}
        servicoNome={servico.servico_nome}
      />
    </div>
  );
}
