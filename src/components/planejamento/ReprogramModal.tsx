import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface LancamentoReprog {
  id: string;
  fornecedor: string;
  valor: number;
  dataAtual: string;
  novaData: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  servicoNome: string;
  diasDelta: number;
  lancamentos: LancamentoReprog[];
  onConfirm: (selected: { id: string; novaData: string }[]) => void;
  isPending?: boolean;
}

export function ReprogramModal({ open, onClose, servicoNome, diasDelta, lancamentos, onConfirm, isPending }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(lancamentos.map(l => l.id)));

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const items = lancamentos
      .filter(l => selected.has(l.id))
      .map(l => ({ id: l.id, novaData: l.novaData }));
    onConfirm(items);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Reprogramar lançamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A data do serviço <span className="font-medium text-foreground">{servicoNome}</span> mudou{' '}
            <span className="font-mono font-medium">{diasDelta > 0 ? '+' : ''}{diasDelta}</span> dias.
            Deseja reprogramar também os lançamentos vinculados?
          </p>

          {lancamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lançamento vinculado encontrado.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="w-8 py-1.5 px-2" />
                    <th className="text-left py-1.5 px-2">Fornecedor</th>
                    <th className="text-right py-1.5 px-2">Valor</th>
                    <th className="text-center py-1.5 px-2">Atual</th>
                    <th className="text-center py-1.5 px-2">→ Proposta</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="py-1.5 px-2">
                        <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                      </td>
                      <td className="py-1.5 px-2">{l.fornecedor}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(l.valor)}</td>
                      <td className="py-1.5 px-2 text-center">{l.dataAtual ? formatDate(l.dataAtual) : '—'}</td>
                      <td className="py-1.5 px-2 text-center font-medium text-primary">{formatDate(l.novaData)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            {selected.size} de {lancamentos.length} selecionados
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={isPending || selected.size === 0}>
            Reprogramar {selected.size} lançamento{selected.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
