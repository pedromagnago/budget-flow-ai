import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterAvanco } from '@/hooks/useSchedule';
import { toast } from 'sonner';

interface Props {
  servicoId: string;
  servicoNome: string;
  medicaoNumero: number;
  qtdTotal: number;
  onClose: () => void;
}

export function ProgressModal({ servicoId, servicoNome, medicaoNumero, qtdTotal, onClose }: Props) {
  const [casas, setCasas] = useState<number>(0);
  const mutation = useRegisterAvanco();

  const handleSave = () => {
    if (casas < 0 || casas > qtdTotal) {
      toast.error(`Valor deve estar entre 0 e ${qtdTotal}`);
      return;
    }
    mutation.mutate(
      { servicoId, casasConcluidas: casas, qtdTotal },
      {
        onSuccess: () => {
          toast.success(`Avanço registrado: ${casas}/${qtdTotal} casas`);
          onClose();
        },
        onError: () => toast.error('Erro ao registrar avanço'),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Avanço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Serviço</p>
            <p className="text-sm font-medium">{servicoNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Medição</p>
            <p className="text-sm font-medium font-mono">M{medicaoNumero}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Quantas casas com este serviço concluído?</Label>
            <Input
              type="number"
              min={0}
              max={qtdTotal}
              value={casas}
              onChange={e => setCasas(parseInt(e.target.value) || 0)}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Total de casas: {qtdTotal} — Percentual: {qtdTotal > 0 ? ((casas / qtdTotal) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
