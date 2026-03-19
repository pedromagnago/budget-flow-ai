import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, X, Unlock, Target, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useMedicoesFinanceiro, useLiberarMedicao, type MedicaoFinanceiro, type TriggerResult } from '@/hooks/usePlanejamento';
import { useCreateMedicao, useUpdateMedicao, useDeleteMedicao, useMedicoesMetas, useCronogramaServicos } from '@/hooks/useSchedule';
import { ImpactBanner } from './ImpactBanner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
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
  futuro: 'Futuro', em_andamento: 'Em andamento', atrasado: 'Atrasado',
  liberado_aguardando: 'Aguardando pgto', recebido: 'Recebido',
};

export function MedicoesTab() {
  const { data: medicoes, isLoading } = useMedicoesFinanceiro();
  const { data: servicos } = useCronogramaServicos();
  const { data: metas } = useMedicoesMetas();
  const { companyId } = useCompany();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [adding, setAdding] = useState(false);
  const [liberarModal, setLiberarModal] = useState<MedicaoFinanceiro | null>(null);
  const [metasDrawer, setMetasDrawer] = useState<number | null>(null);
  const [metaValues, setMetaValues] = useState<Record<string, string>>({});
  const [newRow, setNewRow] = useState({ data_inicio: '', data_fim: '', valor_planejado: '' });
  const [liberarForm, setLiberarForm] = useState({ valor: '', data: new Date().toISOString().split('T')[0], obs: '' });
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);

  const metaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMut = useCreateMedicao();
  const updateMut = useUpdateMedicao();
  const deleteMut = useDeleteMedicao();
  const liberarMut = useLiberarMedicao();

  const list = medicoes ?? [];
  const nextNumero = list.length > 0 ? Math.max(...list.map(m => m.numero)) + 1 : 1;
  const totals = list.reduce((acc, m) => ({ plan: acc.plan + m.valor_planejado, lib: acc.lib + m.valor_liberado }), { plan: 0, lib: 0 });

  const activeServicos = useMemo(() => {
    return (servicos ?? []).filter(s => s.valor_total > 0);
  }, [servicos]);

  const metasForDrawer = useMemo(() => {
    if (metasDrawer === null || !activeServicos.length) return [];
    const metaMap: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      if (m.medicao_numero === metasDrawer) metaMap[m.servico_id] = m.meta_percentual;
    });
    return activeServicos.map(sv => ({
      servico_id: sv.id,
      nome: sv.nome,
      meta: metaMap[sv.id] ?? 0,
    }));
  }, [metasDrawer, activeServicos, metas]);

  const metaTotal = useMemo(() => {
    return metasForDrawer.reduce((s, m) => {
      const val = parseFloat(metaValues[m.servico_id] ?? String(m.meta)) || 0;
      return s + val;
    }, 0);
  }, [metasForDrawer, metaValues]);

  const metaFaltam = 100 - metaTotal;

  function openMetasDrawer(numero: number) {
    setMetasDrawer(numero);
    setTimeout(() => {
      const metaMap: Record<string, string> = {};
      (metas ?? []).forEach(m => {
        if (m.medicao_numero === numero) metaMap[m.servico_id] = String(m.meta_percentual);
      });
      setMetaValues(metaMap);
    }, 0);
  }

  function distributeEqually() {
    const count = activeServicos.length;
    if (count === 0) return;
    const each = Math.round((100 / count) * 10) / 10;
    const newValues: Record<string, string> = {};
    activeServicos.forEach((sv, i) => {
      newValues[sv.id] = i === count - 1 ? String(Math.round((100 - each * (count - 1)) * 10) / 10) : String(each);
    });
    setMetaValues(newValues);
  }

  function handleMetaKeyDown(e: React.KeyboardEvent, currentIdx: number) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const nextIdx = currentIdx + 1;
      if (nextIdx < metasForDrawer.length) {
        const nextId = metasForDrawer[nextIdx].servico_id;
        metaInputRefs.current[nextId]?.focus();
        metaInputRefs.current[nextId]?.select();
      }
    }
  }

  async function saveMetasDrawer() {
    if (!metasDrawer || !companyId) return;
    try {
      for (const sv of activeServicos) {
        const val = parseFloat(metaValues[sv.id] ?? '0') || 0;
        const existing = (metas ?? []).find(m => m.servico_id === sv.id && m.medicao_numero === metasDrawer);
        if (existing) {
          await supabase.from('medicoes_metas').update({ meta_percentual: val } as Record<string, unknown>).eq('id', existing.id);
        } else if (val > 0) {
          await supabase.from('medicoes_metas').insert({ company_id: companyId, servico_id: sv.id, medicao_numero: metasDrawer, meta_percentual: val });
        }
      }
      qc.invalidateQueries({ queryKey: ['medicoes-metas'] });
      toast.success('Metas salvas');
      setMetasDrawer(null);
    } catch { toast.error('Erro ao salvar metas'); }
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const numFields = ['valor_planejado', 'valor_liberado'];
    const update: Record<string, unknown> = { [field]: numFields.includes(field) ? parseFloat(value) || 0 : value };
    try { await updateMut.mutateAsync({ id, ...update }); } catch { toast.error('Erro ao atualizar'); }
    setEditing(null);
  }

  async function handleCreate() {
    if (!newRow.data_inicio || !newRow.data_fim || !newRow.valor_planejado) { toast.error('Preencha todos os campos'); return; }
    try {
      await createMut.mutateAsync({ numero: nextNumero, data_inicio: newRow.data_inicio, data_fim: newRow.data_fim, valor_planejado: parseFloat(newRow.valor_planejado) || 0 });
      setAdding(false);
      setNewRow({ data_inicio: '', data_fim: '', valor_planejado: '' });
      toast.success('Medição criada');
    } catch { toast.error('Erro ao criar'); }
  }

  async function handleLiberar() {
    if (!liberarModal) return;
    const valor = parseFloat(liberarForm.valor) || liberarModal.valor_planejado;
    try {
      const result = await liberarMut.mutateAsync({
        medicaoId: liberarModal.id, valorLiberado: valor, dataLiberacao: liberarForm.data, observacao: liberarForm.obs,
        medicaoNumero: liberarModal.numero, valorPlanejado: liberarModal.valor_planejado, lancamentoExistenteId: liberarModal.lancamento_receita_id,
      });
      toast.success(`Medição M${liberarModal.numero} liberada — lançamento de receita criado em A Receber`);
      setLiberarModal(null);
      if (result.type !== 'none') setTriggerResult(result);
    } catch { toast.error('Erro ao liberar'); }
  }

  function renderCell(m: MedicaoFinanceiro, field: string, value: string | number, opts?: { format?: (v: number) => string; type?: string }) {
    if (editing?.id === m.id && editing?.field === field) {
      return (
        <Input
          className="h-7 w-28 text-xs"
          type={opts?.type ?? (typeof value === 'number' ? 'number' : field.startsWith('data') ? 'date' : 'text')}
          value={editing.value}
          onChange={e => setEditing({ ...editing, value: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
          onBlur={commitEdit} autoFocus
        />
      );
    }
    const display = opts?.format && typeof value === 'number' ? opts.format(value) : String(value);
    return <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors" onClick={() => setEditing({ id: m.id, field, value: String(value) })}>{display}</span>;
  }

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <>
      {triggerResult && triggerResult.type !== 'none' && (
        <div className="mb-4"><ImpactBanner result={triggerResult} onDismiss={() => setTriggerResult(null)} /></div>
      )}

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
              <TableHead className="w-24">Ações</TableHead>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Definir metas" onClick={() => openMetasDrawer(m.numero)}>
                      <Target className="h-3.5 w-3.5" />
                    </Button>
                    {(m.status === 'em_andamento' || m.status_financeiro === 'em_andamento') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-consumido" title="Liberar medição"
                        onClick={() => { setLiberarForm({ valor: String(m.valor_planejado), data: new Date().toISOString().split('T')[0], obs: '' }); setLiberarModal(m); }}>
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
            <DialogHeader><DialogTitle>Liberar Medição M{liberarModal.numero}</DialogTitle></DialogHeader>
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
              <p className="text-[10px] text-muted-foreground">Ao confirmar, um lançamento de receita será criado automaticamente.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setLiberarModal(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleLiberar} disabled={liberarMut.isPending}>Liberar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Drawer Definir Metas — Spreadsheet-style grid */}
      <Sheet open={metasDrawer !== null} onOpenChange={() => setMetasDrawer(null)}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Metas — Medição M{metasDrawer}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={Math.abs(metaTotal - 100) < 0.1 ? 'default' : 'destructive'}
                className="text-xs font-mono"
              >
                {Math.abs(metaTotal - 100) < 0.1
                  ? '✓ 100% distribuído'
                  : `Total: ${metaTotal.toFixed(1)}% (faltam ${metaFaltam.toFixed(1)}%)`
                }
              </Badge>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={distributeEqually}>
                <Equal className="h-3 w-3 mr-1" /> Distribuir igualmente
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_80px] bg-muted/50 px-3 py-1.5 border-b">
                <span className="text-[10px] font-semibold text-muted-foreground">Serviço</span>
                <span className="text-[10px] font-semibold text-muted-foreground text-right">Meta %</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {metasForDrawer.map((m, idx) => (
                  <div key={m.servico_id} className="grid grid-cols-[1fr_80px] items-center px-3 py-1 border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <span className="text-xs truncate pr-2">{m.nome}</span>
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        ref={el => { metaInputRefs.current[m.servico_id] = el; }}
                        type="number"
                        className="h-7 w-16 text-xs text-right font-mono"
                        value={metaValues[m.servico_id] ?? String(m.meta)}
                        onChange={e => setMetaValues(prev => ({ ...prev, [m.servico_id]: e.target.value }))}
                        onKeyDown={e => handleMetaKeyDown(e, idx)}
                        min={0} max={100} step={0.1}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_80px] items-center px-3 py-2 bg-muted/30 border-t">
                <span className="text-xs font-semibold">Total</span>
                <span className={`text-xs font-mono font-bold text-right ${Math.abs(metaTotal - 100) < 0.1 ? 'text-consumido' : 'text-destructive'}`}>
                  {metaTotal.toFixed(1)}%
                </span>
              </div>
            </div>

            <Button className="w-full" size="sm" onClick={saveMetasDrawer}>Salvar Metas</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
