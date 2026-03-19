import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Check, X, Copy, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { useServicosSituacao, useUpdateServicoPlanning, fetchLancamentosForReprogramming, useReprogramarLancamentos } from '@/hooks/usePlanejamento';
import { useCreateServico, useDeleteServico, useAvancoFisico, useMedicoesMetas } from '@/hooks/useSchedule';
import { useBudgetSummary } from '@/hooks/useBudget';
import { useCompany } from '@/hooks/useCompany';
import { ReprogramModal } from './ReprogramModal';
import { toast } from 'sonner';

interface EditingCell { id: string; field: string; value: string; }
interface ReprogState {
  servicoId: string; servicoNome: string; diasDelta: number;
  lancamentos: { id: string; fornecedor: string; valor: number; dataAtual: string; novaData: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  futuro: 'bg-muted text-muted-foreground',
  nao_iniciado: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-module-schedule/10 text-module-schedule',
  concluido: 'bg-consumido/10 text-consumido',
  atrasado: 'bg-destructive/10 text-destructive',
};

function getHealthIndicator(situacao: string, realPct: number, metaPct: number) {
  if (situacao === 'concluido') return { emoji: '✅', label: 'Concluído', color: 'text-consumido' };
  if (situacao === 'futuro' || situacao === 'nao_iniciado') return { emoji: '⚪', label: 'Futuro', color: 'text-muted-foreground' };
  if (metaPct > 0 && realPct < metaPct * 0.8) return { emoji: '🔴', label: 'Atrasado', color: 'text-destructive' };
  if (metaPct > 0 && realPct < metaPct) return { emoji: '🟡', label: 'Atenção', color: 'text-module-dashboard' };
  return { emoji: '🟢', label: 'No prazo', color: 'text-consumido' };
}

export function ServicosTab() {
  const { data: servicos, isLoading } = useServicosSituacao();
  const { data: avancos } = useAvancoFisico();
  const { data: grupos } = useBudgetSummary();
  const { data: metas } = useMedicoesMetas();
  const { companyId } = useCompany();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [adding, setAdding] = useState(false);
  const [reprogState, setReprogState] = useState<ReprogState | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [newRow, setNewRow] = useState({
    nome: '', valor_total: '', quantidade: '64', codigo: '',
    unidade: 'un', responsavel: '', data_inicio_plan: '', data_fim_plan: '', grupo_id: '',
  });

  const prevDateRef = useRef<{ id: string; field: string; value: string } | null>(null);

  const updateMut = useUpdateServicoPlanning();
  const createMut = useCreateServico();
  const deleteMut = useDeleteServico();
  const reprogMut = useReprogramarLancamentos();

  const avancoMap = useMemo(() => {
    const map: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!map[a.servico_id] || pct > map[a.servico_id]) map[a.servico_id] = pct;
    });
    return map;
  }, [avancos]);

  const metaTotalMap = useMemo(() => {
    const map: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      map[m.servico_id] = (map[m.servico_id] ?? 0) + m.meta_percentual;
    });
    return map;
  }, [metas]);

  const grupoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (grupos ?? []).forEach(g => { map[g.grupo_id] = g.grupo; });
    return map;
  }, [grupos]);

  const list = servicos ?? [];
  const totalValor = list.reduce((s, sv) => s + sv.valor_total, 0);
  const avgAvanco = list.length > 0
    ? list.reduce((s, sv) => s + (avancoMap[sv.id] ?? 0), 0) / list.length
    : 0;

  function toggleExpanded(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startEdit(id: string, field: string, value: string | number | null) {
    if (field === 'data_inicio_plan' || field === 'data_fim_plan') {
      prevDateRef.current = { id, field, value: String(value ?? '') };
    }
    setEditing({ id, field, value: String(value ?? '') });
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const numFields = ['valor_total', 'quantidade', 'preco_unitario', 'ordem'];
    const update: Record<string, unknown> = {
      [field]: numFields.includes(field) ? parseFloat(value) || 0 : value || null,
    };
    try {
      await updateMut.mutateAsync({ id, ...update });

      if ((field === 'data_inicio_plan' || field === 'data_fim_plan') && prevDateRef.current && value) {
        const oldDate = prevDateRef.current.value;
        if (oldDate && oldDate !== value) {
          const diasDelta = Math.ceil((new Date(value).getTime() - new Date(oldDate).getTime()) / 86400000);
          if (diasDelta !== 0) {
            const servico = list.find(s => s.id === id);
            const grupoId = servico?.grupo_id ?? null;
            const cid = companyId ?? 'default';
            const startDate = servico?.data_inicio_plan ?? value;
            const lancs = await fetchLancamentosForReprogramming(cid, grupoId, startDate, '2099-12-31');
            if (lancs.length > 0) {
              setReprogState({
                servicoId: id, servicoNome: servico?.nome ?? '', diasDelta,
                lancamentos: lancs.map(l => ({ ...l, novaData: new Date(new Date(l.dataAtual).getTime() + diasDelta * 86400000).toISOString().split('T')[0] })),
              });
            }
          }
        }
      }
    } catch { toast.error('Erro ao atualizar'); }
    setEditing(null);
    prevDateRef.current = null;
  }

  async function handleReprogramConfirm(selected: { id: string; novaData: string }[]) {
    if (!reprogState) return;
    try {
      await reprogMut.mutateAsync({ lancamentos: selected, servicoId: reprogState.servicoId, servicoNome: reprogState.servicoNome, diasDelta: reprogState.diasDelta });
      toast.success(`${selected.length} lançamento(s) reprogramado(s)`);
      setReprogState(null);
    } catch { toast.error('Erro ao reprogramar'); }
  }

  async function handleCreate() {
    if (!newRow.nome || !newRow.valor_total) { toast.error('Preencha nome e valor'); return; }
    try {
      await createMut.mutateAsync({ nome: newRow.nome, valor_total: parseFloat(newRow.valor_total) || 0, quantidade: parseInt(newRow.quantidade) || 64 });
      setAdding(false);
      setNewRow({ nome: '', valor_total: '', quantidade: '64', codigo: '', unidade: 'un', responsavel: '', data_inicio_plan: '', data_fim_plan: '', grupo_id: '' });
      toast.success('Serviço criado');
    } catch { toast.error('Erro ao criar'); }
  }

  async function handleDuplicate(sv: typeof list[0]) {
    try {
      await createMut.mutateAsync({ nome: `${sv.nome} (cópia)`, valor_total: sv.valor_total, quantidade: sv.quantidade ?? 64 });
      toast.success('Serviço duplicado');
    } catch { toast.error('Erro ao duplicar'); }
  }

  async function handleSoftDelete(id: string) {
    try {
      await updateMut.mutateAsync({ id, ativo: false });
      toast.success('Serviço desativado');
    } catch { toast.error('Erro ao desativar'); }
  }

  function renderCell(id: string, field: string, value: string | number | null, opts?: { format?: (v: number) => string; type?: string }) {
    if (editing?.id === id && editing?.field === field) {
      if (field === 'grupo_id') {
        return (
          <Select value={editing.value} onValueChange={async (v) => {
            try { await updateMut.mutateAsync({ id, grupo_id: v || null }); } catch { toast.error('Erro'); }
            setEditing(null);
          }}>
            <SelectTrigger className="h-7 w-full text-xs"><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              {(grupos ?? []).map(g => (<SelectItem key={g.grupo_id} value={g.grupo_id}>{g.grupo}</SelectItem>))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          className="h-7 w-full min-w-[60px] text-xs"
          type={opts?.type ?? (typeof value === 'number' ? 'number' : field.includes('data') ? 'date' : 'text')}
          value={editing.value}
          onChange={e => setEditing({ ...editing, value: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
          onBlur={commitEdit}
          autoFocus
        />
      );
    }
    if (field === 'grupo_id') {
      const display = value ? grupoMap[String(value)] ?? '—' : '—';
      return <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors text-xs" onClick={() => startEdit(id, field, value)}>{display}</span>;
    }
    const display = opts?.format && typeof value === 'number' ? opts.format(value) : (value ?? '—');
    return <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors text-xs" onClick={() => startEdit(id, field, value)}>{String(display)}</span>;
  }

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <>
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
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-16">Código</TableHead>
              <TableHead className="min-w-[160px]">Nome</TableHead>
              <TableHead className="w-12">Saúde</TableHead>
              <TableHead className="w-24">Grupo</TableHead>
              <TableHead className="w-14">Unid.</TableHead>
              <TableHead className="text-right w-14">Qtd</TableHead>
              <TableHead className="text-right w-24">Vlr Unit.</TableHead>
              <TableHead className="text-right w-28">Vlr Total</TableHead>
              <TableHead className="w-24">Responsável</TableHead>
              <TableHead className="w-24">Início Plan</TableHead>
              <TableHead className="w-24">Fim Plan</TableHead>
              <TableHead className="w-24">Início Real</TableHead>
              <TableHead className="w-24">Fim Real</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((sv, idx) => {
              const realPct = avancoMap[sv.id] ?? 0;
              const metaPct = metaTotalMap[sv.id] ?? 0;
              const health = getHealthIndicator(sv.situacao_calculada, realPct, metaPct);
              const isExpanded = expandedRows.has(sv.id);

              return (
                <>
                  <TableRow key={sv.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab" />
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell>{renderCell(sv.id, 'codigo', sv.codigo)}</TableCell>
                    <TableCell className="font-medium">{renderCell(sv.id, 'nome', sv.nome)}</TableCell>
                    <TableCell>
                      <button
                        className={`text-sm cursor-pointer hover:scale-110 transition-transform flex items-center gap-0.5 ${health.color}`}
                        onClick={() => toggleExpanded(sv.id)}
                        title={health.label}
                      >
                        <span>{health.emoji}</span>
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </TableCell>
                    <TableCell>{renderCell(sv.id, 'grupo_id', sv.grupo_id)}</TableCell>
                    <TableCell>{renderCell(sv.id, 'unidade', sv.unidade)}</TableCell>
                    <TableCell className="text-right">{renderCell(sv.id, 'quantidade', sv.quantidade, { type: 'number' })}</TableCell>
                    <TableCell className="text-right font-mono">{renderCell(sv.id, 'preco_unitario', sv.preco_unitario, { format: formatCurrency, type: 'number' })}</TableCell>
                    <TableCell className="text-right font-mono">{renderCell(sv.id, 'valor_total', sv.valor_total, { format: formatCurrency, type: 'number' })}</TableCell>
                    <TableCell>{renderCell(sv.id, 'responsavel', sv.responsavel)}</TableCell>
                    <TableCell>{renderCell(sv.id, 'data_inicio_plan', sv.data_inicio_plan, { type: 'date' })}</TableCell>
                    <TableCell>{renderCell(sv.id, 'data_fim_plan', sv.data_fim_plan, { type: 'date' })}</TableCell>
                    <TableCell>{renderCell(sv.id, 'data_inicio_real', sv.data_inicio_real, { type: 'date' })}</TableCell>
                    <TableCell>{renderCell(sv.id, 'data_fim_real', sv.data_fim_real, { type: 'date' })}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[sv.situacao_calculada] ?? STATUS_COLORS.futuro}`}>
                        {sv.situacao_calculada}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicar" onClick={() => handleDuplicate(sv)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Desativar" onClick={() => handleSoftDelete(sv.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${sv.id}-detail`}>
                      <TableCell colSpan={16} className="bg-muted/30 p-3">
                        <div className="flex flex-wrap gap-6 text-xs">
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">Real vs Meta</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{realPct.toFixed(1)}%</span>
                              <span className="text-muted-foreground">/ {metaPct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden mt-1">
                              <div className={`h-full rounded-full ${realPct >= metaPct ? 'bg-consumido' : 'bg-destructive'}`} style={{ width: `${metaPct > 0 ? Math.min((realPct / metaPct) * 100, 100) : 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">Desvio</p>
                            <Badge variant={sv.dias_atraso > 0 ? 'destructive' : 'default'} className="text-[10px]">
                              {sv.dias_atraso > 0 ? `${sv.dias_atraso}d atrasado` : sv.dias_atraso < 0 ? `${Math.abs(sv.dias_atraso)}d adiantado` : 'No prazo'}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">Valor</p>
                            <span className="font-mono">{formatCurrency(sv.valor_total)}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {adding && (
              <TableRow className="bg-primary/5">
                <TableCell className="text-xs text-muted-foreground">{list.length + 1}</TableCell>
                <TableCell><Input className="h-7 text-xs w-16" value={newRow.codigo} onChange={e => setNewRow({ ...newRow, codigo: e.target.value })} placeholder="COD" /></TableCell>
                <TableCell><Input className="h-7 text-xs" value={newRow.nome} onChange={e => setNewRow({ ...newRow, nome: e.target.value })} placeholder="Nome do serviço" /></TableCell>
                <TableCell>⚪</TableCell>
                <TableCell className="text-xs text-muted-foreground">—</TableCell>
                <TableCell className="text-xs">un</TableCell>
                <TableCell><Input type="number" className="h-7 text-xs w-14 text-right" value={newRow.quantidade} onChange={e => setNewRow({ ...newRow, quantidade: e.target.value })} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">—</TableCell>
                <TableCell><Input type="number" className="h-7 text-xs w-24 text-right" value={newRow.valor_total} onChange={e => setNewRow({ ...newRow, valor_total: e.target.value })} placeholder="0.00" /></TableCell>
                <TableCell colSpan={5} className="text-xs text-muted-foreground">—</TableCell>
                <TableCell><Badge className="text-[10px] bg-muted text-muted-foreground">futuro</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreate}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAdding(false)}><X className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8} className="font-semibold text-xs">{list.length} serviços ativos · Avanço médio: {avgAvanco.toFixed(1)}%</TableCell>
              <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(totalValor)}</TableCell>
              <TableCell colSpan={7} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {reprogState && (
        <ReprogramModal
          open onClose={() => setReprogState(null)}
          servicoNome={reprogState.servicoNome} diasDelta={reprogState.diasDelta}
          lancamentos={reprogState.lancamentos} onConfirm={handleReprogramConfirm} isPending={reprogMut.isPending}
        />
      )}
    </>
  );
}
