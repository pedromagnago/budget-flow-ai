import { useState } from 'react';
import { Plus, Trash2, Check, X, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useMedicoesFinanceiro, useLiberarMedicao, type MedicaoFinanceiro } from '@/hooks/usePlanejamento';
import { useCreateMedicao, useUpdateMedicao, useDeleteMedicao } from '@/hooks/useSchedule';
import { toast } from 'sonner';

interface EditingCell { id: string; field: string; value: string; }

const STATUS_FIN_COLORS: Record<string, string> = {
  futuro: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-module-schedule/10 text-module-schedule',
  atrasado: 'bg-destructive/10 text-destructive',
  liberado_aguardando: 'bg-module-dashboard/10 text-module-dashboard',
  recebido: 'bg-consumido/10 text-consumido',
};
const STATUS_FIN_LABELS: Record<string, string> = {
  futuro: 'Futuro',
  em_andamento: 'Em andamento',
  atrasado: 'Atrasado',
  liberado_aguardando: 'Aguardando pgto',
  recebido: 'Recebido',
};

export function MedicoesTab() {
  const { data: medicoes, isLoading } = useMedicoesFinanceiro();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [adding, setAdding] = useState(false);
  const [liberarModal, setLiberarModal] = useState<MedicaoFinanceiro | null>(null);
  const [newRow, setNewRow] = useState({ data_inicio: '', data_fim: '', valor_planejado: '' });
  const [liberarForm, setLiberarForm] = useState({ valor: '', data: new Date().toISOString().split('T')[0], obs: '' });

  const createMut = useCreateMedicao();
  const updateMut = useUpdateMedicao();
  const deleteMut = useDeleteMedicao();
  const liberarMut = useLiberarMedicao();

  const list = medicoes ?? [];
  const nextNumero = list.length > 0 ? Math.max(...list.map(m => m.numero)) + 1 : 1;
  const totals = list.reduce((acc, m) => ({ plan: acc.plan + m.valor_planejado, lib: acc.lib + m.valor_liberado }), { plan: 0, lib: 0 });

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const numFields = ['valor_planejado', 'valor_liberado'];
    const update: Record<string, unknown> = {
      [field]: numFields.includes(field) ? parseFloat(value) || 0 : value,
    };
    try {
      await updateMut.mutateAsync({ id, ...update });
    } catch { toast.error('Erro ao atualizar'); }
    setEditing(null);
  }

  async function handleCreate() {
    if (!newRow.data_inicio || !newRow.data_fim || !newRow.valor_planejado) { toast.error('Preencha todos os campos'); return; }
    try {
      await createMut.mutateAsync({
        numero: nextNumero,
        data_inicio: newRow.data_inicio,
        data_fim: newRow.data_fim,
        valor_planejado: parseFloat(newRow.valor_planejado) || 0,
      });
      setAdding(false);
      setNewRow({ data_inicio: '', data_fim: '', valor_planejado: '' });
      toast.success('Medição criada');
    } catch { toast.error('Erro ao criar'); }
  }

  async function handleLiberar() {
    if (!liberarModal) return;
    const valor = parseFloat(liberarForm.valor) || liberarModal.valor_planejado;
    try {
      await liberarMut.mutateAsync({
        medicaoId: liberarModal.id,
        valorLiberado: valor,
        dataLiberacao: liberarForm.data,
        observacao: liberarForm.obs,
        medicaoNumero: liberarModal.numero,
        lancamentoExistenteId: liberarModal.lancamento_receita_id,
      });
      toast.success(`Medição M${liberarModal.numero} liberada — lançamento de receita criado`);
      setLiberarModal(null);
    } catch { toast.error('Erro ao liberar'); }
  }

  function renderCell(m: MedicaoFinanceiro, field: string, value: string | number, opts?: { format?: (v: number) => string; type?: string }) {
    if (editing?.id === m.id && editing?.field === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            className="h-7 w-28 text-xs"
            type={opts?.type ?? (typeof value === 'number' ? 'number' : field.startsWith('data') ? 'date' : 'text')}
            value={editing.value}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
            onBlur={commitEdit}
            autoFocus
          />
        </div>
      );
    }
    const display = opts?.format && typeof value === 'number' ? opts.format(value) : String(value);
    return (
      <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors" onClick={() => setEditing({ id: m.id, field, value: String(value) })}>
        {display}
      </span>
    );
  }

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <>
      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Medições</h3>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-4 w-4 mr-1" /> Nova Medição
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">Nº</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead className="text-right">Vlr Planejado</TableHead>
              <TableHead className="text-right">Vlr Liberado</TableHead>
              <TableHead>Prev. Liberação</TableHead>
              <TableHead>Liberação Real</TableHead>
              <TableHead>Status Fin.</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(m => (
              <TableRow key={m.id} className="group">
                <TableCell className="font-mono text-xs font-bold">M{m.numero}</TableCell>
                <TableCell className="text-xs">{renderCell(m, 'data_inicio', m.data_inicio, { type: 'date' })}</TableCell>
                <TableCell className="text-xs">{renderCell(m, 'data_fim', m.data_fim, { type: 'date' })}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(m, 'valor_planejado', m.valor_planejado, { format: formatCurrency })}</TableCell>
                <TableCell className="text-right font-mono text-xs">{renderCell(m, 'valor_liberado', m.valor_liberado, { format: formatCurrency })}</TableCell>
                <TableCell className="text-xs">{renderCell(m, 'previsao_liberacao', m.previsao_liberacao ?? '', { type: 'date' })}</TableCell>
                <TableCell className="text-xs">{m.data_real_liberacao ? formatDate(m.data_real_liberacao) : '—'}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${STATUS_FIN_COLORS[m.status_financeiro] ?? STATUS_FIN_COLORS.futuro}`}>
                    {STATUS_FIN_LABELS[m.status_financeiro] ?? m.status_financeiro}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    {(m.status === 'em_andamento' || m.status_financeiro === 'em_andamento') && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-consumido"
                        title="Liberar medição"
                        onClick={() => {
                          setLiberarForm({ valor: String(m.valor_planejado), data: new Date().toISOString().split('T')[0], obs: '' });
                          setLiberarModal(m);
                        }}
                      >
                        <Unlock className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMut.mutate(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {adding && (
              <TableRow className="bg-primary/5">
                <TableCell className="font-mono text-xs font-bold">M{nextNumero}</TableCell>
                <TableCell><Input type="date" className="h-7 w-28 text-xs" value={newRow.data_inicio} onChange={e => setNewRow({ ...newRow, data_inicio: e.target.value })} /></TableCell>
                <TableCell><Input type="date" className="h-7 w-28 text-xs" value={newRow.data_fim} onChange={e => setNewRow({ ...newRow, data_fim: e.target.value })} /></TableCell>
                <TableCell><Input type="number" className="h-7 w-28 text-xs text-right" value={newRow.valor_planejado} onChange={e => setNewRow({ ...newRow, valor_planejado: e.target.value })} placeholder="0.00" /></TableCell>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">—</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
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
              <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totals.plan)}</TableCell>
              <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totals.lib)}</TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Modal de liberação */}
      {liberarModal && (
        <Dialog open onOpenChange={() => setLiberarModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Liberar Medição M{liberarModal.numero}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Valor a liberar</Label>
                <Input type="number" value={liberarForm.valor} onChange={e => setLiberarForm({ ...liberarForm, valor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data de liberação</Label>
                <Input type="date" value={liberarForm.data} onChange={e => setLiberarForm({ ...liberarForm, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Observação</Label>
                <Textarea value={liberarForm.obs} onChange={e => setLiberarForm({ ...liberarForm, obs: e.target.value })} rows={2} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ao confirmar, um lançamento de receita será criado automaticamente em A Receber com vencimento em 15 dias.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setLiberarModal(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleLiberar} disabled={liberarMut.isPending}>Liberar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
