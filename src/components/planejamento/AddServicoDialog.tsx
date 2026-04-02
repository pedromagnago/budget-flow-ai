import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCreateServicoEtapa } from '@/hooks/usePlanejamentoHierarquico';

interface Props {
  open: boolean;
  onClose: () => void;
  grupoId: string;
  etapaNome: string;
}

export function AddServicoDialog({ open, onClose, grupoId, etapaNome }: Props) {
  const createServico = useCreateServicoEtapa();
  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    data_inicio_plan: '',
    data_fim_plan: '',
    responsavel: '',
  });

  function reset() {
    setForm({ nome: '', codigo: '', data_inicio_plan: '', data_fim_plan: '', responsavel: '' });
  }

  async function handleSubmit() {
    if (!form.nome) return;
    await createServico.mutateAsync({
      grupo_id: grupoId,
      nome: form.nome,
      codigo: form.codigo || undefined,
      data_inicio_plan: form.data_inicio_plan || undefined,
      data_fim_plan: form.data_fim_plan || undefined,
      responsavel: form.responsavel || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Novo Serviço — {etapaNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do serviço *</Label>
            <Input
              placeholder="Ex: Alvenaria, Elétrica, Fundação"
              value={form.nome}
              onChange={e => setForm(v => ({ ...v, nome: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Código</Label>
              <Input
                placeholder="ELE-01"
                value={form.codigo}
                onChange={e => setForm(v => ({ ...v, codigo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Input
                placeholder="Nome"
                value={form.responsavel}
                onChange={e => setForm(v => ({ ...v, responsavel: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Início Planejado</Label>
              <Input
                type="date"
                value={form.data_inicio_plan}
                onChange={e => setForm(v => ({ ...v, data_inicio_plan: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fim Planejado</Label>
              <Input
                type="date"
                value={form.data_fim_plan}
                onChange={e => setForm(v => ({ ...v, data_fim_plan: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createServico.isPending || !form.nome}>
            {createServico.isPending ? 'Criando...' : 'Criar Serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
