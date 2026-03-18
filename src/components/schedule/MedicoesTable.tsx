import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/formatters';
import { Medicao, useCreateMedicao, useUpdateMedicao, useDeleteMedicao } from '@/hooks/useSchedule';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['futura', 'em_andamento', 'liberada'] as const;

interface EditingCell {
  id: string;
  field: string;
  value: string;
}

export function MedicoesTable({ medicoes }: { medicoes: Medicao[] }) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ data_inicio: '', data_fim: '', valor_planejado: '' });

  const createMutation = useCreateMedicao();
  const updateMutation = useUpdateMedicao();
  const deleteMutation = useDeleteMedicao();

  const nextNumero = medicoes.length > 0 ? Math.max(...medicoes.map(m => m.numero)) + 1 : 1;

  const totals = medicoes.reduce(
    (acc, m) => ({
      planejado: acc.planejado + m.valor_planejado,
      liberado: acc.liberado + m.valor_liberado,
    }),
    { planejado: 0, liberado: 0 }
  );

  function startEdit(id: string, field: string, value: string | number) {
    setEditing({ id, field, value: String(value) });
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const numFields = ['valor_planejado', 'valor_liberado'];
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
    if (!newRow.data_inicio || !newRow.data_fim || !newRow.valor_planejado) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await createMutation.mutateAsync({
        numero: nextNumero,
        data_inicio: newRow.data_inicio,
        data_fim: newRow.data_fim,
        valor_planejado: parseFloat(newRow.valor_planejado) || 0,
      });
      setAdding(false);
      setNewRow({ data_inicio: '', data_fim: '', valor_planejado: '' });
      toast.success('Medição criada');
    } catch {
      toast.error('Erro ao criar medição');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Medição removida');
    } catch {
      toast.error('Erro ao remover');
    }
  }

  function renderCell(m: Medicao, field: string, value: string | number, format?: (v: number) => string) {
    if (editing?.id === m.id && editing?.field === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            className="h-7 w-28 text-xs"
            type={typeof value === 'number' ? 'number' : field.startsWith('data') ? 'date' : 'text'}
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
      <span
        className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
        onClick={() => startEdit(m.id, field, value)}
      >
        {display}
      </span>
    );
  }

  return (
    <div className="bg-card border rounded-xl shadow-card overflow-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Medições & Pagamentos</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Medição
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead className="text-right">Valor Planejado</TableHead>
            <TableHead className="text-right">Valor Liberado</TableHead>
            <TableHead className="text-right">% Liberado</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {medicoes.map(m => {
            const pctLib = m.valor_planejado > 0 ? (m.valor_liberado / m.valor_planejado) * 100 : 0;
            const saldo = m.valor_planejado - m.valor_liberado;
            return (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs font-bold">{m.numero}</TableCell>
                <TableCell className="text-xs">{renderCell(m, 'data_inicio', m.data_inicio)}</TableCell>
                <TableCell className="text-xs">{renderCell(m, 'data_fim', m.data_fim)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(m, 'valor_planejado', m.valor_planejado, formatCurrency)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(m, 'valor_liberado', m.valor_liberado, formatCurrency)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{pctLib.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(saldo)}</TableCell>
                <TableCell>
                  {editing?.id === m.id && editing?.field === 'status' ? (
                    <select
                      className="text-xs border rounded px-1 py-0.5 bg-background"
                      value={editing.value}
                      onChange={e => setEditing({ ...editing, value: e.target.value })}
                      onBlur={commitEdit}
                      autoFocus
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className="cursor-pointer" onClick={() => startEdit(m.id, 'status', m.status)}>
                      <StatusBadge status={m.status} />
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          {adding && (
            <TableRow className="bg-primary/5">
              <TableCell className="font-mono text-xs font-bold">{nextNumero}</TableCell>
              <TableCell><Input type="date" className="h-7 w-28 text-xs" value={newRow.data_inicio} onChange={e => setNewRow({ ...newRow, data_inicio: e.target.value })} /></TableCell>
              <TableCell><Input type="date" className="h-7 w-28 text-xs" value={newRow.data_fim} onChange={e => setNewRow({ ...newRow, data_fim: e.target.value })} /></TableCell>
              <TableCell><Input type="number" className="h-7 w-28 text-xs text-right" placeholder="0.00" value={newRow.valor_planejado} onChange={e => setNewRow({ ...newRow, valor_planejado: e.target.value })} /></TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
              <TableCell><StatusBadge status="futura" /></TableCell>
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
            <TableCell colSpan={3} className="font-semibold text-xs">Total</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totals.planejado)}</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totals.liberado)}</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">
              {totals.planejado > 0 ? ((totals.liberado / totals.planejado) * 100).toFixed(1) : '0.0'}%
            </TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totals.planejado - totals.liberado)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
