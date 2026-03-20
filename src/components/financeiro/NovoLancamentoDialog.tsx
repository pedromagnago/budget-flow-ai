import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Link2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useCreateLancamento } from '@/hooks/useFinanceiro';
import { useOrcamentoItemsComGrupo, type OrcamentoItemComGrupo } from '@/hooks/useOrcamentoItems';
import { useFornecedores } from '@/hooks/useFornecedores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'despesa' | 'receita';
}

export function NovoLancamentoDialog({ open, onOpenChange, tipo }: Props) {
  const createMut = useCreateLancamento();
  const { data: orcamentoItems = [] } = useOrcamentoItemsComGrupo();
  const { data: fornecedores = [] } = useFornecedores();

  const [modo, setModo] = useState<'manual' | 'orcamento'>('orcamento');
  const [searchOrcamento, setSearchOrcamento] = useState('');
  const [selectedItem, setSelectedItem] = useState<OrcamentoItemComGrupo | null>(null);

  const [form, setForm] = useState({
    fornecedor_razao: '',
    fornecedor_id: '',
    valor: '',
    data_vencimento: '',
    departamento: '',
    categoria: '',
    forma_pagamento: '',
    observacao: '',
    e_previsao: false,
    orcamento_item_id: '',
  });

  const resetForm = () => {
    setForm({
      fornecedor_razao: '', fornecedor_id: '', valor: '', data_vencimento: '',
      departamento: '', categoria: '', forma_pagamento: '', observacao: '',
      e_previsao: false, orcamento_item_id: '',
    });
    setSelectedItem(null);
    setSearchOrcamento('');
  };

  // Filter orçamento items
  const filteredItems = useMemo(() => {
    if (!searchOrcamento) return orcamentoItems;
    const q = searchOrcamento.toLowerCase();
    return orcamentoItems.filter(i =>
      i.item.toLowerCase().includes(q) ||
      i.grupo_nome.toLowerCase().includes(q) ||
      i.apropriacao.toLowerCase().includes(q)
    );
  }, [orcamentoItems, searchOrcamento]);

  // Group items by etapa
  const groupedItems = useMemo(() => {
    const map: Record<string, OrcamentoItemComGrupo[]> = {};
    filteredItems.forEach(item => {
      const key = item.grupo_nome;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  const selectOrcamentoItem = (item: OrcamentoItemComGrupo) => {
    setSelectedItem(item);
    setForm(prev => ({
      ...prev,
      orcamento_item_id: item.id,
      departamento: item.grupo_nome,
      categoria: item.apropriacao,
      valor: item.valor_saldo > 0 ? String(item.valor_saldo) : String(item.valor_orcado),
    }));
    // Try to match fornecedor
    if (item.fornecedor_id) {
      const forn = fornecedores.find(f => f.id === item.fornecedor_id);
      if (forn) {
        setForm(prev => ({
          ...prev,
          fornecedor_razao: forn.razao_social,
          fornecedor_id: forn.id,
        }));
      }
    }
  };

  const handleCreate = async () => {
    try {
      const valor = tipo === 'despesa' ? -Math.abs(Number(form.valor)) : Math.abs(Number(form.valor));
      await createMut.mutateAsync({
        tipo,
        valor,
        fornecedor_razao: form.fornecedor_razao || undefined,
        data_vencimento: form.data_vencimento || undefined,
        departamento: form.departamento || undefined,
        categoria: form.categoria || undefined,
        forma_pagamento: form.forma_pagamento || undefined,
        observacao: form.observacao || undefined,
        e_previsao: form.e_previsao,
        orcamento_item_id: form.orcamento_item_id || undefined,
      });
      toast.success('Lançamento criado');
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error('Erro ao criar lançamento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Novo lançamento — {tipo === 'despesa' ? 'A Pagar' : 'A Receber'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={modo} onValueChange={v => setModo(v as 'manual' | 'orcamento')}>
          <TabsList className="w-full">
            <TabsTrigger value="orcamento" className="flex-1">
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Do Orçamento
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Manual
            </TabsTrigger>
          </TabsList>

          {/* Aba: Vincular ao Orçamento */}
          <TabsContent value="orcamento" className="space-y-3 mt-3">
            {selectedItem ? (
              <div className="border rounded-lg p-3 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Item selecionado</p>
                    <p className="font-semibold text-sm">{selectedItem.grupo_nome} → {selectedItem.item}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedItem(null); setForm(prev => ({ ...prev, orcamento_item_id: '' })); }}>
                    Trocar
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Orçado</span>
                    <p className="font-mono font-semibold">{formatCurrency(selectedItem.valor_orcado)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumido</span>
                    <p className="font-mono font-semibold text-orange-600">{formatCurrency(selectedItem.valor_consumido)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Saldo</span>
                    <p className={cn('font-mono font-semibold', selectedItem.valor_saldo < 0 ? 'text-destructive' : 'text-emerald-600')}>
                      {formatCurrency(selectedItem.valor_saldo)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item do orçamento..."
                    value={searchOrcamento}
                    onChange={e => setSearchOrcamento(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {groupedItems.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs py-6">
                      {orcamentoItems.length === 0 ? 'Nenhum item de orçamento cadastrado' : 'Nenhum resultado'}
                    </div>
                  ) : groupedItems.map(([grupo, items]) => (
                    <div key={grupo}>
                      <div className="px-3 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                        {grupo}
                      </div>
                      {items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => selectOrcamentoItem(item)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{item.item}</p>
                            <p className="text-[10px] text-muted-foreground">{item.apropriacao}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-mono">{formatCurrency(item.valor_orcado)}</p>
                            <p className={cn(
                              'text-[10px] font-mono',
                              item.valor_saldo < 0 ? 'text-destructive' : 'text-muted-foreground',
                            )}>
                              Saldo: {formatCurrency(item.valor_saldo)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Aba: Manual */}
          <TabsContent value="manual" className="mt-3">
            <p className="text-xs text-muted-foreground">
              Crie um lançamento sem vínculo direto com o orçamento.
            </p>
          </TabsContent>
        </Tabs>

        {/* Formulário comum */}
        <div className="grid gap-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fornecedor</Label>
              {fornecedores.length > 0 ? (
                <Select
                  value={form.fornecedor_id || '__manual__'}
                  onValueChange={v => {
                    if (v === '__manual__') {
                      setForm(prev => ({ ...prev, fornecedor_id: '', fornecedor_razao: '' }));
                    } else {
                      const f = fornecedores.find(f => f.id === v);
                      setForm(prev => ({ ...prev, fornecedor_id: v, fornecedor_razao: f?.razao_social ?? '' }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Digitar manualmente</SelectItem>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.razao_social} {f.cnpj ? `(${f.cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.fornecedor_razao}
                  onChange={e => setForm(p => ({ ...p, fornecedor_razao: e.target.value }))}
                  placeholder="Nome do fornecedor"
                />
              )}
              {form.fornecedor_id === '' && fornecedores.length > 0 && (
                <Input
                  className="mt-1"
                  value={form.fornecedor_razao}
                  onChange={e => setForm(p => ({ ...p, fornecedor_razao: e.target.value }))}
                  placeholder="Nome do fornecedor"
                />
              )}
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={form.valor}
                onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0,00"
              />
              {selectedItem && Number(form.valor) > selectedItem.valor_saldo && selectedItem.valor_saldo > 0 && (
                <p className="text-[10px] text-destructive mt-0.5">
                  ⚠ Acima do saldo orçamentário ({formatCurrency(selectedItem.valor_saldo)})
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.forma_pagamento || '__none__'} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Departamento / Etapa</Label>
              <Input
                value={form.departamento}
                onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Observação</Label>
            <Input
              value={form.observacao}
              onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.e_previsao}
              onChange={e => setForm(p => ({ ...p, e_previsao: e.target.checked }))}
              className="rounded"
            />
            É previsão/planejamento
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!form.valor || createMut.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
