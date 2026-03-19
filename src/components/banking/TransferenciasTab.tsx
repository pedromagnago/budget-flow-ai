import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTransferencias, useCreateTransferencia, useDeleteTransferencia, useContasSaldo } from '@/hooks/useBanking';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

export function TransferenciasTab() {
  const { data: transferencias, isLoading } = useTransferencias();
  const { data: contas } = useContasSaldo();
  const createMut = useCreateTransferencia();
  const deleteMut = useDeleteTransferencia();

  const contaMap = useMemo(() => {
    const m: Record<string, string> = {};
    (contas ?? []).forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [contas]);

  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    conta_origem: '', conta_destino: '', valor: '', descricao: '',
  });

  async function handleCreate() {
    if (!form.conta_origem || !form.conta_destino || !form.valor) { toast.error('Preencha todos os campos'); return; }
    if (form.conta_origem === form.conta_destino) { toast.error('Origem e destino devem ser diferentes'); return; }
    try {
      await createMut.mutateAsync({
        conta_origem: form.conta_origem, conta_destino: form.conta_destino,
        data: form.data, valor: parseFloat(form.valor) || 0,
        descricao: form.descricao || 'Transferência entre contas',
      });
      toast.success('Transferência realizada');
      setModal(false);
      setForm({ data: new Date().toISOString().split('T')[0], conta_origem: '', conta_destino: '', valor: '', descricao: '' });
    } catch { toast.error('Erro ao criar transferência'); }
  }

  async function handleDelete(tid: string) {
    try {
      await deleteMut.mutateAsync(tid);
      toast.success('Transferência excluída');
    } catch { toast.error('Erro ao excluir'); }
  }

  const list = transferencias ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Transferência
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhuma transferência</TableCell></TableRow>
            ) : list.map(t => (
              <Collapsible key={t.transferencia_id} asChild open={expanded === t.transferencia_id} onOpenChange={open => setExpanded(open ? t.transferencia_id : null)}>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/30 group">
                      <TableCell className="text-xs font-mono">{formatDate(t.data)}</TableCell>
                      <TableCell className="text-xs">{contaMap[t.conta_origem_id] ?? '—'}</TableCell>
                      <TableCell className="text-xs">{contaMap[t.conta_destino_id] ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">{formatCurrency(t.valor)}</TableCell>
                      <TableCell className="text-xs">{t.descricao}</TableCell>
                      <TableCell><Badge variant="default" className="text-[10px] bg-consumido/10 text-consumido">Conciliado</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={e => { e.stopPropagation(); handleDelete(t.transferencia_id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={7} className="text-xs text-muted-foreground py-3 px-6">
                        <div className="grid grid-cols-2 gap-2">
                          {t.movs.map(mov => (
                            <div key={mov.id} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{mov.tipo === 'transferencia_saida' ? 'Saída' : 'Entrada'}</Badge>
                              <span>{contaMap[mov.conta_id] ?? mov.conta_id.substring(0, 8)}</span>
                              <span className={`font-mono ${mov.valor < 0 ? 'text-destructive' : 'text-consumido'}`}>{formatCurrency(mov.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {modal && (
        <Dialog open onOpenChange={() => setModal(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Conta de origem *</Label>
                <Select value={form.conta_origem} onValueChange={v => setForm({ ...form, conta_origem: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Conta de destino *</Label>
                <Select value={form.conta_destino} onValueChange={v => setForm({ ...form, conta_destino: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).filter(c => c.id !== form.conta_origem).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Transferência entre contas" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setModal(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>Transferir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
