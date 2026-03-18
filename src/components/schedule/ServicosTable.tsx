import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { CronogramaServico, useCreateServico, useUpdateServico, useDeleteServico } from '@/hooks/useSchedule';
import { toast } from 'sonner';

interface EditingCell {
  id: string;
  field: string;
  value: string;
}

export function ServicosTable({ servicos }: { servicos: CronogramaServico[] }) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ nome: '', valor_total: '', quantidade: '64' });

  const createMutation = useCreateServico();
  const updateMutation = useUpdateServico();
  const deleteMutation = useDeleteServico();

  const totalValor = servicos.reduce((s, sv) => s + sv.valor_total, 0);

  function startEdit(id: string, field: string, value: string | number) {
    setEditing({ id, field, value: String(value) });
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const numFields = ['valor_total', 'quantidade'];
    const update: Record<string, unknown> = {
      [field]: numFields.includes(field) ? parseFloat(value) || 0 : value,
    };
    try {
      await updateMutation.mutateAsync({ id, ...update });
      toast.success('Atualizado');
    } catch {
      toast.error('Erro ao atualizar');
    }
    setEditing(null);
  }

  async function handleCreate() {
    if (!newRow.nome || !newRow.valor_total) {
      toast.error('Preencha nome e valor');
      return;
    }
    try {
      await createMutation.mutateAsync({
        nome: newRow.nome,
        valor_total: parseFloat(newRow.valor_total) || 0,
        quantidade: parseInt(newRow.quantidade) || 64,
      });
      setAdding(false);
      setNewRow({ nome: '', valor_total: '', quantidade: '64' });
      toast.success('Serviço criado');
    } catch {
      toast.error('Erro ao criar');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Serviço removido');
    } catch {
      toast.error('Erro ao remover');
    }
  }

  function renderCell(sv: CronogramaServico, field: string, value: string | number, format?: (v: number) => string) {
    if (editing?.id === sv.id && editing?.field === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            className="h-7 w-32 text-xs"
            type={typeof value === 'number' ? 'number' : 'text'}
            value={editing.value}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={commitEdit}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(null)}><X className="h-3 w-3" /></Button>
        </div>
      );
    }
    const display = format ? format(value as number) : String(value);
    return (
      <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors" onClick={() => startEdit(sv.id, field, value)}>
        {display}
      </span>
    );
  }

  return (
    <div className="bg-card border rounded-xl shadow-card overflow-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Serviços do Cronograma</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Novo Serviço
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Serviço</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Qtd Casas</TableHead>
            <TableHead className="text-right">Preço Unit.</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {servicos.map(sv => {
            const precoUnit = (sv.quantidade && sv.quantidade > 0) ? sv.valor_total / sv.quantidade : 0;
            return (
              <TableRow key={sv.id}>
                <TableCell className="text-xs font-medium">{renderCell(sv, 'nome', sv.nome)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(sv, 'valor_total', sv.valor_total, formatCurrency)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(sv, 'quantidade', sv.quantidade ?? 0)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(precoUnit)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(sv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          {adding && (
            <TableRow className="bg-primary/5">
              <TableCell><Input className="h-7 text-xs" placeholder="Nome do serviço" value={newRow.nome} onChange={e => setNewRow({ ...newRow, nome: e.target.value })} /></TableCell>
              <TableCell><Input type="number" className="h-7 w-28 text-xs text-right" placeholder="0.00" value={newRow.valor_total} onChange={e => setNewRow({ ...newRow, valor_total: e.target.value })} /></TableCell>
              <TableCell><Input type="number" className="h-7 w-20 text-xs text-right" value={newRow.quantidade} onChange={e => setNewRow({ ...newRow, quantidade: e.target.value })} /></TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}><Check className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold text-xs">Total ({servicos.length} serviços)</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totalValor)}</TableCell>
            <TableCell colSpan={3} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
