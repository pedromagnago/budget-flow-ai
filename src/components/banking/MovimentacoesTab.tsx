import { useState, useMemo } from 'react';
import { Plus, Pencil, Check, X, Upload, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  useMovimentacoes, useCreateMovimentacao, useUpdateMovimentacao,
  useContasSaldo, type Movimentacao,
} from '@/hooks/useBanking';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { parseOFX } from '@/lib/ofxParser';

interface EditingCell { id: string; field: string; value: string; }

export function MovimentacoesTab() {
  const { user } = useAuth();
  const { data: contas } = useContasSaldo();
  const contaMap = useMemo(() => {
    const m: Record<string, string> = {};
    (contas ?? []).forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [contas]);

  // Filters
  const [filContaIds, setFilContaIds] = useState<string[]>([]);
  const [filTipo, setFilTipo] = useState('todos');
  const [filConciliado, setFilConciliado] = useState('todos');
  const [filDataInicio, setFilDataInicio] = useState('');
  const [filDataFim, setFilDataFim] = useState('');
  const [filSearch, setFilSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (v: string) => {
    setFilSearch(v);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => setSearchDebounced(v), 300));
  };

  const hasFilters = filContaIds.length > 0 || filTipo !== 'todos' || filConciliado !== 'todos' || filDataInicio || filDataFim || filSearch;

  const { data: movs, isLoading } = useMovimentacoes({
    contaIds: filContaIds.length > 0 ? filContaIds : undefined,
    tipo: filTipo,
    conciliado: filConciliado === 'sim' ? 'sim' : filConciliado === 'nao' ? 'nao' : undefined,
    dataInicio: filDataInicio || undefined,
    dataFim: filDataFim || undefined,
    search: searchDebounced || undefined,
  });

  const createMut = useCreateMovimentacao();
  const updateMut = useUpdateMovimentacao();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    conta_id: '', data: new Date().toISOString().split('T')[0], tipo: 'saida',
    descricao: '', valor: '', fornecedor: '', documento: '', categoria: '', observacao: '',
    conta_destino_id: '',
  });

  // OFX Import state
  const [ofxPreview, setOfxPreview] = useState<{ transactions: { date: string; memo: string; amount: number; fitid: string }[]; contaId: string; accountInfo: string } | null>(null);
  const [ofxSelected, setOfxSelected] = useState<Set<number>>(new Set());

  const list = movs ?? [];
  const total = list.reduce((s, m) => s + m.valor, 0);

  async function handleCreate() {
    if (!newForm.conta_id || !newForm.descricao || !newForm.valor) { toast.error('Preencha os campos obrigatórios'); return; }
    try {
      await createMut.mutateAsync({
        conta_id: newForm.conta_id, data: newForm.data, tipo: newForm.tipo,
        descricao: newForm.descricao, valor: parseFloat(newForm.valor) || 0,
        fornecedor: newForm.fornecedor || undefined, documento: newForm.documento || undefined,
        categoria: newForm.categoria || undefined, observacao: newForm.observacao || undefined,
      });
      toast.success('Movimentação criada');
      setModal(false);
      setNewForm({ conta_id: '', data: new Date().toISOString().split('T')[0], tipo: 'saida', descricao: '', valor: '', fornecedor: '', documento: '', categoria: '', observacao: '', conta_destino_id: '' });
    } catch { toast.error('Erro ao criar'); }
  }

  async function commitEdit() {
    if (!editing) return;
    try {
      await updateMut.mutateAsync({ id: editing.id, [editing.field]: editing.value || null });
    } catch { toast.error('Erro ao atualizar'); }
    setEditing(null);
  }

  async function toggleConciliado(m: Movimentacao) {
    try {
      await updateMut.mutateAsync({
        id: m.id,
        conciliado: !m.conciliado,
        conciliado_em: !m.conciliado ? new Date().toISOString() : null,
        conciliado_por: !m.conciliado ? user?.id : null,
      });
    } catch { toast.error('Erro'); }
  }

  // ── OFX Import ──
  async function handleOFXFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseOFX(text);
      if (result.transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo OFX');
        return;
      }
      setOfxPreview({
        transactions: result.transactions.map(t => ({ date: t.date, memo: t.memo, amount: t.amount, fitid: t.fitid })),
        contaId: '',
        accountInfo: `Banco: ${result.bankId || '—'} · Conta: ${result.accountId || '—'} · ${result.transactions.length} transações`,
      });
      setOfxSelected(new Set(result.transactions.map((_, i) => i)));
      toast.success(`${result.transactions.length} transações carregadas do OFX`);
    } catch { toast.error('Erro ao ler o arquivo OFX'); }
    e.target.value = '';
  }

  async function importOFXTransactions() {
    if (!ofxPreview?.contaId) { toast.error('Selecione a conta destino'); return; }
    const selected = ofxPreview.transactions.filter((_, i) => ofxSelected.has(i));
    if (selected.length === 0) { toast.error('Selecione ao menos uma transação'); return; }
    let ok = 0;
    for (const t of selected) {
      try {
        await createMut.mutateAsync({
          conta_id: ofxPreview.contaId,
          data: t.date,
          tipo: t.amount >= 0 ? 'entrada' : 'saida',
          descricao: t.memo || 'OFX Import',
          valor: Math.abs(t.amount),
          documento: t.fitid || undefined,
        });
        ok++;
      } catch { /* skip individual errors */ }
    }
    toast.success(`${ok} movimentações importadas`);
    setOfxPreview(null);
  }

  function renderEditableCell(m: Movimentacao, field: string, value: string | null) {
    if (editing?.id === m.id && editing?.field === field) {
      return (
        <div className="flex items-center gap-1">
          <Input className="h-7 w-full text-xs" value={editing.value}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
            onBlur={commitEdit} autoFocus />
        </div>
      );
    }
    return <span className="text-xs">{value ?? '—'}</span>;
  }

  function clearFilters() {
    setFilContaIds([]); setFilTipo('todos'); setFilConciliado('todos');
    setFilDataInicio(''); setFilDataFim(''); setFilSearch(''); setSearchDebounced('');
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="h-8 w-32 text-xs" placeholder="De" value={filDataInicio} onChange={e => setFilDataInicio(e.target.value)} />
        <Input type="date" className="h-8 w-32 text-xs" placeholder="Até" value={filDataFim} onChange={e => setFilDataFim(e.target.value)} />
        <Select value={filTipo} onValueChange={setFilTipo}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filConciliado} onValueChange={setFilConciliado}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Conciliado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sim">Conciliados</SelectItem>
            <SelectItem value="nao">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <Input className="h-8 w-48 text-xs" placeholder="Buscar descrição/fornecedor..."
          value={filSearch} onChange={e => handleSearch(e.target.value)} />
        {hasFilters && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>Limpar</Button>}
        <div className="ml-auto flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".ofx,.OFX" className="hidden" onChange={handleOFXFile} />
            <Button size="sm" variant="outline" className="h-8 gap-1" asChild><span><Upload className="h-3.5 w-3.5" /> Importar OFX</span></Button>
          </label>
          <Button size="sm" className="h-8" onClick={() => setModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Exibindo {list.length} — Total: <span className={`font-mono font-bold ${total >= 0 ? 'text-consumido' : 'text-destructive'}`}>{formatCurrency(total)}</span>
      </p>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20">Data</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Nenhuma movimentação encontrada</TableCell></TableRow>
            ) : list.map(m => (
              <Collapsible key={m.id} asChild open={expanded === m.id} onOpenChange={open => setExpanded(open ? m.id : null)}>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/30 group">
                      <TableCell className="text-xs font-mono">{formatDate(m.data)}</TableCell>
                      <TableCell className="text-xs">{contaMap[m.conta_id] ?? '—'}</TableCell>
                      <TableCell>{renderEditableCell(m, 'descricao', m.descricao)}</TableCell>
                      <TableCell>{renderEditableCell(m, 'fornecedor', m.fornecedor)}</TableCell>
                      <TableCell>{renderEditableCell(m, 'documento', m.documento)}</TableCell>
                      <TableCell className="text-xs">{m.categoria ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-xs font-bold ${m.valor >= 0 ? 'text-consumido' : 'text-destructive'}`}>
                          {m.valor >= 0 ? '+' : '–'} {formatCurrency(Math.abs(m.valor))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={m.conciliado} onCheckedChange={() => toggleConciliado(m)} className="h-3.5 w-3.5" />
                          <Badge variant={m.conciliado ? 'default' : 'secondary'} className="text-[10px]">
                            {m.conciliado ? '✓' : '○'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={e => { e.stopPropagation(); setEditing({ id: m.id, field: 'descricao', value: m.descricao }); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={9} className="text-xs text-muted-foreground py-3 px-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div><span className="font-medium">Tipo:</span> {m.tipo}</div>
                          <div><span className="font-medium">Observação:</span> {m.observacao ?? '—'}</div>
                          <div><span className="font-medium">Lançamento:</span> {m.lancamento_id ? m.lancamento_id.substring(0, 8) + '...' : 'Não vinculado'}</div>
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

      {/* Modal nova movimentação */}
      {modal && (
        <Dialog open onOpenChange={() => setModal(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={newForm.data} onChange={e => setNewForm({ ...newForm, data: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Conta *</Label>
                <Select value={newForm.conta_id} onValueChange={v => setNewForm({ ...newForm, conta_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo *</Label>
                <Select value={newForm.tipo} onValueChange={v => setNewForm({ ...newForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" value={newForm.valor} onChange={e => setNewForm({ ...newForm, valor: e.target.value })} placeholder="0.00" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Descrição *</Label>
                <Input value={newForm.descricao} onChange={e => setNewForm({ ...newForm, descricao: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Fornecedor</Label>
                <Input value={newForm.fornecedor} onChange={e => setNewForm({ ...newForm, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Documento</Label>
                <Input value={newForm.documento} onChange={e => setNewForm({ ...newForm, documento: e.target.value })} placeholder="Nº NF, boleto..." />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Observação</Label>
                <Textarea value={newForm.observacao} onChange={e => setNewForm({ ...newForm, observacao: e.target.value })} rows={2} />
              </div>
              {newForm.tipo === 'transferencia' && (
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Conta Destino *</Label>
                  <Select value={newForm.conta_destino_id} onValueChange={v => setNewForm({ ...newForm, conta_destino_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a conta destino" /></SelectTrigger>
                    <SelectContent>
                      {(contas ?? []).filter(c => c.id !== newForm.conta_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newForm.tipo === 'transferencia' && (
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Conta Destino *</Label>
                  <Select value={newForm.conta_destino_id} onValueChange={v => setNewForm({ ...newForm, conta_destino_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a conta destino" /></SelectTrigger>
                    <SelectContent>
                      {(contas ?? []).filter(c => c.id !== newForm.conta_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setModal(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal preview OFX */}
      {ofxPreview && (
        <Dialog open onOpenChange={() => setOfxPreview(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader><DialogTitle>Importar Extrato OFX</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">{ofxPreview.accountInfo}</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Conta Destino *</Label>
                <Select value={ofxPreview.contaId} onValueChange={v => setOfxPreview(p => p ? { ...p, contaId: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={ofxSelected.size === ofxPreview.transactions.length} onCheckedChange={c => {
                  if (c) setOfxSelected(new Set(ofxPreview.transactions.map((_, i) => i)));
                  else setOfxSelected(new Set());
                }} />
                <span className="text-xs text-muted-foreground">{ofxSelected.size} de {ofxPreview.transactions.length} selecionadas</span>
              </div>
              <div className="border rounded-lg max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50"><th className="py-1.5 px-2 w-8"></th><th className="py-1.5 px-2">Data</th><th className="py-1.5 px-2">Descrição</th><th className="py-1.5 px-2 text-right">Valor</th></tr></thead>
                  <tbody>
                    {ofxPreview.transactions.map((t, i) => (
                      <tr key={i} className="border-t hover:bg-muted/20">
                        <td className="py-1 px-2"><Checkbox checked={ofxSelected.has(i)} onCheckedChange={c => { const n = new Set(ofxSelected); c ? n.add(i) : n.delete(i); setOfxSelected(n); }} /></td>
                        <td className="py-1 px-2 font-mono">{t.date}</td>
                        <td className="py-1 px-2 truncate max-w-xs">{t.memo}</td>
                        <td className={`py-1 px-2 text-right font-mono font-bold ${t.amount >= 0 ? 'text-consumido' : 'text-destructive'}`}>
                          {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOfxPreview(null)}>Cancelar</Button>
              <Button size="sm" onClick={importOFXTransactions} disabled={createMut.isPending || !ofxPreview.contaId}>Importar {ofxSelected.size} transações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
