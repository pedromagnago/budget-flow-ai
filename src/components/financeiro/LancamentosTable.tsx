import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Check, Pencil, Scissors, Trash2, Plus, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  useLancamentosStatus,
  useCreateLancamento,
  useUpdateLancamento,
  useSoftDeleteLancamento,
  useRegistrarPagamento,
  useParcelarLancamento,
  type LancamentoStatus,
} from '@/hooks/useFinanceiro';
import { useContasSaldo } from '@/hooks/useBanking';
import { useCompany } from '@/hooks/useCompany';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  previsto: { label: 'Previsto', className: 'bg-muted text-muted-foreground' },
  pendente: { label: 'Pendente', className: 'bg-primary/10 text-primary' },
  vence_em_breve: { label: 'Vence em breve', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  atrasado: { label: 'Atrasado', className: 'bg-destructive/10 text-destructive' },
  pago: { label: 'Pago', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

interface Props {
  tipo: 'despesa' | 'receita';
}

export function LancamentosTable({ tipo }: Props) {
  const { data: lancamentos = [], isLoading } = useLancamentosStatus(tipo);
  const { data: contas = [] } = useContasSaldo();
  const createMut = useCreateLancamento();
  const updateMut = useUpdateLancamento();
  const deleteMut = useSoftDeleteLancamento();
  const pagamentoMut = useRegistrarPagamento();
  const parcelarMut = useParcelarLancamento();
  const { companyId } = useCompany();

  // Filters
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, any>>({});

  // Modals
  const [showNew, setShowNew] = useState(false);
  const [showPag, setShowPag] = useState<LancamentoStatus | null>(null);
  const [showParc, setShowParc] = useState<LancamentoStatus | null>(null);

  // New lancamento form
  const [newForm, setNewForm] = useState({
    fornecedor_razao: '', valor: '', data_vencimento: '', departamento: '',
    categoria: '', forma_pagamento: '', observacao: '', e_previsao: false,
  });

  // Pagamento form
  const [pagForm, setPagForm] = useState({
    conta_bancaria_id: '', data_pagamento: new Date().toISOString().slice(0, 10),
    valor_pago: '', documento: '', observacao: '',
  });

  // Parcelar form
  const [parcForm, setParcForm] = useState({
    parcelas: '2', data_primeira: '', intervalo: 'mensal' as 'mensal' | 'quinzenal' | 'semanal',
  });

  const filtered = useMemo(() => {
    let list = lancamentos.filter(l => !l.e_previsao);
    if (filterStatus.length > 0) list = list.filter(l => filterStatus.includes(l.status_calculado ?? ''));
    if (filterFornecedor) {
      const q = filterFornecedor.toLowerCase();
      list = list.filter(l => (l.fornecedor_razao ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [lancamentos, filterStatus, filterFornecedor]);

  const totals = useMemo(() => {
    const byStatus = { previsto: 0, pendente: 0, atrasado: 0, pago: 0 };
    filtered.forEach(l => {
      const s = l.status_calculado ?? 'pendente';
      if (s in byStatus) byStatus[s as keyof typeof byStatus] += Math.abs(l.valor);
      if (s === 'vence_em_breve') byStatus.pendente += Math.abs(l.valor);
    });
    return byStatus;
  }, [filtered]);

  // Inline edit
  const startEdit = (l: LancamentoStatus) => {
    setEditingId(l.id);
    setEditFields({
      data_vencimento: l.data_vencimento ?? '',
      fornecedor_razao: l.fornecedor_razao ?? '',
      departamento: l.departamento ?? '',
      categoria: l.categoria ?? '',
      valor: Math.abs(l.valor),
      forma_pagamento: l.forma_pagamento ?? '',
      observacao: l.observacao ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const updates: any = { ...editFields };
      if (updates.valor !== undefined) {
        updates.valor = tipo === 'despesa' ? -Math.abs(Number(updates.valor)) : Math.abs(Number(updates.valor));
      }
      await updateMut.mutateAsync({ id: editingId, ...updates });
      toast.success('Lançamento atualizado');
      setEditingId(null);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleCreate = async () => {
    try {
      const valor = tipo === 'despesa' ? -Math.abs(Number(newForm.valor)) : Math.abs(Number(newForm.valor));
      await createMut.mutateAsync({
        tipo,
        valor,
        fornecedor_razao: newForm.fornecedor_razao || undefined,
        data_vencimento: newForm.data_vencimento || undefined,
        departamento: newForm.departamento || undefined,
        categoria: newForm.categoria || undefined,
        forma_pagamento: newForm.forma_pagamento || undefined,
        observacao: newForm.observacao || undefined,
        e_previsao: newForm.e_previsao,
      });
      toast.success('Lançamento criado');
      setShowNew(false);
      setNewForm({ fornecedor_razao: '', valor: '', data_vencimento: '', departamento: '', categoria: '', forma_pagamento: '', observacao: '', e_previsao: false });
    } catch {
      toast.error('Erro ao criar lançamento');
    }
  };

  const handlePagamento = async () => {
    if (!showPag) return;
    try {
      await pagamentoMut.mutateAsync({
        lancamento_id: showPag.id,
        conta_bancaria_id: pagForm.conta_bancaria_id,
        data_pagamento: pagForm.data_pagamento,
        valor_pago: Number(pagForm.valor_pago) || Math.abs(showPag.valor),
        documento: pagForm.documento || undefined,
        observacao: pagForm.observacao || undefined,
        tipo_mov: tipo === 'despesa' ? 'saida' : 'entrada',
        fornecedor: showPag.fornecedor_razao ?? undefined,
      });
      toast.success(tipo === 'despesa' ? 'Pagamento registrado' : 'Recebimento registrado');
      setShowPag(null);
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  const handleParcelar = async () => {
    if (!showParc) return;
    try {
      await parcelarMut.mutateAsync({
        lancamento_id: showParc.id,
        tipo,
        valor_total: Math.abs(showParc.valor),
        parcelas: Number(parcForm.parcelas),
        data_primeira: parcForm.data_primeira,
        intervalo: parcForm.intervalo,
        fornecedor_razao: showParc.fornecedor_razao ?? undefined,
        departamento: showParc.departamento ?? undefined,
        categoria: showParc.categoria ?? undefined,
        orcamento_item_id: showParc.orcamento_item_id ?? undefined,
      });
      toast.success(`Parcelado em ${parcForm.parcelas}x`);
      setShowParc(null);
    } catch {
      toast.error('Erro ao parcelar');
    }
  };

  const actionLabel = tipo === 'despesa' ? 'Registrar pagamento' : 'Registrar recebimento';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar fornecedor..."
          value={filterFornecedor}
          onChange={e => setFilterFornecedor(e.target.value)}
          className="w-56"
        />
        <Select value={filterStatus.join(',') || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? [] : [v])}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="previsto">Previsto</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vence_em_breve">Vence em breve</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
        {(filterStatus.length > 0 || filterFornecedor) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus([]); setFilterFornecedor(''); }}>
            Limpar filtros
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo lançamento
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</TableCell></TableRow>
            ) : filtered.map(l => {
              const status = l.status_calculado ?? 'pendente';
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
              const isEditing = editingId === l.id;

              return (
                <TableRow
                  key={l.id}
                  className={cn(status === 'atrasado' && 'bg-destructive/5')}
                >
                  <TableCell>
                    {isEditing ? (
                      <Input type="date" value={editFields.data_vencimento} onChange={e => setEditFields(p => ({ ...p, data_vencimento: e.target.value }))} className="h-8 w-32" />
                    ) : (
                      l.data_vencimento ? format(new Date(l.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input value={editFields.fornecedor_razao} onChange={e => setEditFields(p => ({ ...p, fornecedor_razao: e.target.value }))} className="h-8 w-40" />
                    ) : (
                      <span className="truncate max-w-[180px] block">{l.fornecedor_razao ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input value={editFields.departamento} onChange={e => setEditFields(p => ({ ...p, departamento: e.target.value }))} className="h-8 w-32" />
                    ) : (
                      <span className="text-xs">{l.departamento_limpo ?? l.departamento ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input value={editFields.categoria} onChange={e => setEditFields(p => ({ ...p, categoria: e.target.value }))} className="h-8 w-28" />
                    ) : (
                      <span className="text-xs">{l.categoria ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(l.total_parcelas ?? 1) > 1 ? `${l.numero_parcela}/${l.total_parcelas}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {isEditing ? (
                      <Input type="number" value={editFields.valor} onChange={e => setEditFields(p => ({ ...p, valor: e.target.value }))} className="h-8 w-28 text-right" />
                    ) : (
                      formatCurrency(l.valor)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs">
                    {l.valor_pago > 0 ? formatCurrency(l.valor_pago) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-[10px] uppercase tracking-wider font-semibold', cfg.className)}>
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Save className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {status !== 'pago' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title={actionLabel} onClick={() => { setShowPag(l); setPagForm({ conta_bancaria_id: '', data_pagamento: new Date().toISOString().slice(0, 10), valor_pago: String(Math.abs(l.valor)), documento: '', observacao: '' }); }}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => startEdit(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {(l.total_parcelas ?? 1) <= 1 && status !== 'pago' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Parcelar" onClick={() => { setShowParc(l); setParcForm({ parcelas: '2', data_primeira: l.data_vencimento ?? new Date().toISOString().slice(0, 10), intervalo: 'mensal' }); }}>
                            <Scissors className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={async () => { await deleteMut.mutateAsync(l.id); toast.success('Lançamento excluído'); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer totals */}
      <div className="flex gap-6 text-xs text-muted-foreground px-1">
        <span>Previsto: <strong className="text-foreground">{formatCurrency(totals.previsto)}</strong></span>
        <span>Pendente: <strong className="text-foreground">{formatCurrency(totals.pendente)}</strong></span>
        <span>Atrasado: <strong className="text-destructive">{formatCurrency(totals.atrasado)}</strong></span>
        <span>Pago: <strong className="text-emerald-600">{formatCurrency(totals.pago)}</strong></span>
      </div>

      {/* Modal: Novo lançamento */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo lançamento — {tipo === 'despesa' ? 'A Pagar' : 'A Receber'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Fornecedor / Descrição</Label>
              <Input value={newForm.fornecedor_razao} onChange={e => setNewForm(p => ({ ...p, fornecedor_razao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$)</Label><Input type="number" value={newForm.valor} onChange={e => setNewForm(p => ({ ...p, valor: e.target.value }))} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={newForm.data_vencimento} onChange={e => setNewForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Departamento</Label><Input value={newForm.departamento} onChange={e => setNewForm(p => ({ ...p, departamento: e.target.value }))} /></div>
              <div><Label>Categoria</Label><Input value={newForm.categoria} onChange={e => setNewForm(p => ({ ...p, categoria: e.target.value }))} /></div>
            </div>
            <div><Label>Forma de pagamento</Label><Input value={newForm.forma_pagamento} onChange={e => setNewForm(p => ({ ...p, forma_pagamento: e.target.value }))} /></div>
            <div><Label>Observação</Label><Input value={newForm.observacao} onChange={e => setNewForm(p => ({ ...p, observacao: e.target.value }))} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newForm.e_previsao} onChange={e => setNewForm(p => ({ ...p, e_previsao: e.target.checked }))} className="rounded" />
              É previsão/planejamento
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newForm.valor || createMut.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar pagamento/recebimento */}
      <Dialog open={!!showPag} onOpenChange={() => setShowPag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{actionLabel}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Conta bancária</Label>
              <Select value={pagForm.conta_bancaria_id} onValueChange={v => setPagForm(p => ({ ...p, conta_bancaria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.banco}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={pagForm.data_pagamento} onChange={e => setPagForm(p => ({ ...p, data_pagamento: e.target.value }))} /></div>
              <div><Label>Valor pago (R$)</Label><Input type="number" value={pagForm.valor_pago} onChange={e => setPagForm(p => ({ ...p, valor_pago: e.target.value }))} /></div>
            </div>
            <div><Label>Documento (NF, boleto)</Label><Input value={pagForm.documento} onChange={e => setPagForm(p => ({ ...p, documento: e.target.value }))} /></div>
            <div><Label>Observação</Label><Input value={pagForm.observacao} onChange={e => setPagForm(p => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPag(null)}>Cancelar</Button>
            <Button onClick={handlePagamento} disabled={!pagForm.conta_bancaria_id || pagamentoMut.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Parcelar */}
      <Dialog open={!!showParc} onOpenChange={() => setShowParc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Parcelar lançamento</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nº de parcelas</Label><Input type="number" min={2} max={24} value={parcForm.parcelas} onChange={e => setParcForm(p => ({ ...p, parcelas: e.target.value }))} /></div>
            <div><Label>Data da 1ª parcela</Label><Input type="date" value={parcForm.data_primeira} onChange={e => setParcForm(p => ({ ...p, data_primeira: e.target.value }))} /></div>
            <div>
              <Label>Intervalo</Label>
              <Select value={parcForm.intervalo} onValueChange={v => setParcForm(p => ({ ...p, intervalo: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showParc && Number(parcForm.parcelas) >= 2 && (
              <div className="text-xs text-muted-foreground border rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {Array.from({ length: Number(parcForm.parcelas) }).map((_, i) => {
                  const d = new Date(parcForm.data_primeira || new Date());
                  if (parcForm.intervalo === 'mensal') d.setMonth(d.getMonth() + i);
                  else if (parcForm.intervalo === 'quinzenal') d.setDate(d.getDate() + i * 15);
                  else d.setDate(d.getDate() + i * 7);
                  const vlr = Math.abs(showParc.valor) / Number(parcForm.parcelas);
                  return <div key={i}>{i + 1}/{parcForm.parcelas} — {format(d, 'dd/MM/yyyy')} — {formatCurrency(vlr)}</div>;
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParc(null)}>Cancelar</Button>
            <Button onClick={handleParcelar} disabled={!parcForm.data_primeira || parcelarMut.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
