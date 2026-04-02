import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useFormasPagamento } from '@/hooks/useFormasPagamento';
import { useCreateItemServico } from '@/hooks/usePlanejamentoHierarquico';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
  grupoId: string;
  servicoId: string;
  servicoNome: string;
}

export function AddItemDialog({ open, onClose, grupoId, servicoId, servicoNome }: Props) {
  const { data: fornecedores } = useFornecedores();
  const { data: formasPgto } = useFormasPagamento();
  const createItem = useCreateItemServico();

  const [form, setForm] = useState({
    item: '',
    unidade: 'un',
    quantidade_total: '',
    custo_unitario: '',
    fornecedor_id: '',
    forma_pagamento_id: '',
    dias_prazo_pagamento: '30',
    observacoes: '',
  });

  const qty = parseFloat(form.quantidade_total) || 0;
  const unit = parseFloat(form.custo_unitario) || 0;
  const total = qty * unit;

  function reset() {
    setForm({
      item: '', unidade: 'un', quantidade_total: '', custo_unitario: '',
      fornecedor_id: '', forma_pagamento_id: '', dias_prazo_pagamento: '30', observacoes: '',
    });
  }

  async function handleSubmit() {
    if (!form.item || qty <= 0 || unit <= 0) return;
    await createItem.mutateAsync({
      grupo_id: grupoId,
      servico_id: servicoId,
      item: form.item,
      unidade: form.unidade,
      quantidade_total: qty,
      custo_unitario: unit,
      fornecedor_id: form.fornecedor_id || undefined,
      forma_pagamento_id: form.forma_pagamento_id || undefined,
      dias_prazo_pagamento: parseInt(form.dias_prazo_pagamento) || 30,
      observacoes: form.observacoes || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Novo Item — {servicoNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do item *</Label>
            <Input
              placeholder="Ex: Cimento CP-II 50kg"
              value={form.item}
              onChange={e => setForm(v => ({ ...v, item: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Select value={form.unidade} onValueChange={v => setForm(f => ({ ...f, unidade: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['un', 'kg', 'm', 'm²', 'm³', 'L', 'cx', 'pç', 'sc', 'vb'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number" min={0} step="0.01"
                placeholder="0"
                value={form.quantidade_total}
                onChange={e => setForm(v => ({ ...v, quantidade_total: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Unitário (R$) *</Label>
              <Input
                type="number" min={0} step="0.01"
                placeholder="0,00"
                value={form.custo_unitario}
                onChange={e => setForm(v => ({ ...v, custo_unitario: e.target.value }))}
              />
            </div>
          </div>

          {/* Total computed */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
            <span className="text-lg font-bold font-mono">{formatCurrency(total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm(f => ({ ...f, fornecedor_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {(fornecedores ?? []).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={form.forma_pagamento_id} onValueChange={v => setForm(f => ({ ...f, forma_pagamento_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {(formasPgto ?? []).map(fp => (
                    <SelectItem key={fp.id} value={fp.id}>{fp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Prazo de pagamento (dias após execução)</Label>
            <Input
              type="number" min={0}
              value={form.dias_prazo_pagamento}
              onChange={e => setForm(v => ({ ...v, dias_prazo_pagamento: e.target.value }))}
              className="w-24"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={e => setForm(v => ({ ...v, observacoes: e.target.value }))}
              placeholder="Notas sobre este item..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createItem.isPending || !form.item || qty <= 0 || unit <= 0}>
            {createItem.isPending ? 'Adicionando...' : 'Adicionar Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
