import { useState } from 'react';
import { Building2, Wallet, CreditCard, PiggyBank, TrendingUp, Plus, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useContasSaldo, useCreateConta, useUpdateConta, useAjustarSaldo, type ContaSaldo } from '@/hooks/useBanking';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

const TIPO_ICONS: Record<string, React.ElementType> = {
  corrente: Building2,
  poupanca: PiggyBank,
  caixa: Wallet,
  cartao_credito: CreditCard,
  investimento: TrendingUp,
};

const TIPO_LABELS: Record<string, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  caixa: 'Caixa',
  cartao_credito: 'Cartão de Crédito',
  investimento: 'Investimento',
};

export function ContasTab() {
  const { data: contas, isLoading } = useContasSaldo();
  const createMut = useCreateConta();
  const updateMut = useUpdateConta();
  const ajustarMut = useAjustarSaldo();

  const [drawer, setDrawer] = useState(false);
  const [ajusteModal, setAjusteModal] = useState<ContaSaldo | null>(null);
  const [form, setForm] = useState({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '', data_saldo_inicial: '' });
  const [ajusteForm, setAjusteForm] = useState({ saldo_correto: '', data: new Date().toISOString().split('T')[0], motivo: '' });

  async function handleCreate() {
    if (!form.nome || !form.banco || !form.data_saldo_inicial) { toast.error('Preencha os campos obrigatórios'); return; }
    try {
      await createMut.mutateAsync({
        nome: form.nome, banco: form.banco, agencia: form.agencia || undefined,
        conta: form.conta || undefined, tipo: form.tipo,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        data_saldo_inicial: form.data_saldo_inicial,
      });
      toast.success('Conta criada');
      setDrawer(false);
      setForm({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '', data_saldo_inicial: '' });
    } catch { toast.error('Erro ao criar conta'); }
  }

  async function handleAjuste() {
    if (!ajusteModal || !ajusteForm.motivo) { toast.error('Informe o motivo'); return; }
    try {
      await ajustarMut.mutateAsync({
        conta_id: ajusteModal.id, data: ajusteForm.data,
        saldo_anterior: ajusteModal.saldo_atual,
        saldo_correto: parseFloat(ajusteForm.saldo_correto) || 0,
        motivo: ajusteForm.motivo,
      });
      toast.success('Saldo ajustado');
      setAjusteModal(null);
    } catch { toast.error('Erro ao ajustar'); }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando contas...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDrawer(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(contas ?? []).map(c => {
          const Icon = TIPO_ICONS[c.tipo] ?? Building2;
          const isNeg = c.saldo_atual < 0;
          return (
            <Card key={c.id} className="relative group">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{c.banco} · {TIPO_LABELS[c.tipo] ?? c.tipo}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setAjusteForm({ saldo_correto: String(c.saldo_atual), data: new Date().toISOString().split('T')[0], motivo: '' });
                        setAjusteModal(c);
                      }}>Ajustar saldo</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => updateMut.mutate({ id: c.id, ativo: false })}>
                        Desativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo atual</p>
                  <p className={`text-xl font-bold font-mono ${isNeg ? 'text-destructive' : 'text-consumido'}`}>
                    {formatCurrency(c.saldo_atual)}
                  </p>
                </div>

                {c.pendentes_conciliacao > 0 && (
                  <Badge variant="outline" className="bg-module-dashboard/10 text-module-dashboard border-module-dashboard/30 text-[10px]">
                    {c.pendentes_conciliacao} pendente{c.pendentes_conciliacao > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Drawer nova conta */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent>
          <SheetHeader><SheetTitle>Nova Conta Bancária</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="text-xs">Nome da conta *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="CEF - Conta Obra" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Banco *</Label>
              <Input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Caixa Econômica" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Agência</Label>
                <Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Conta</Label>
                <Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Saldo inicial (R$)</Label>
                <Input type="number" value={form.saldo_inicial} onChange={e => setForm({ ...form, saldo_inicial: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data do saldo *</Label>
                <Input type="date" value={form.data_saldo_inicial} onChange={e => setForm({ ...form, data_saldo_inicial: e.target.value })} />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleCreate} disabled={createMut.isPending}>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal ajuste */}
      {ajusteModal && (
        <Dialog open onOpenChange={() => setAjusteModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Ajustar Saldo — {ajusteModal.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">Saldo atual calculado: <span className="font-mono font-bold">{formatCurrency(ajusteModal.saldo_atual)}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Saldo correto (R$)</Label>
                  <Input type="number" value={ajusteForm.saldo_correto} onChange={e => setAjusteForm({ ...ajusteForm, saldo_correto: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={ajusteForm.data} onChange={e => setAjusteForm({ ...ajusteForm, data: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Motivo do ajuste *</Label>
                <Textarea value={ajusteForm.motivo} onChange={e => setAjusteForm({ ...ajusteForm, motivo: e.target.value })} rows={2} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Diferença: <span className="font-mono font-bold">{formatCurrency((parseFloat(ajusteForm.saldo_correto) || 0) - ajusteModal.saldo_atual)}</span>
                — Uma movimentação de ajuste será criada automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAjusteModal(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleAjuste} disabled={ajustarMut.isPending}>Ajustar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
