import { useState } from 'react';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeactivateFornecedor, useFornecedorResumo } from '@/hooks/useFornecedores';
import { CATEGORIA_FORNECEDOR_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Truck, AlertCircle } from 'lucide-react';
import type { CategoriaFornecedor } from '@/types';

interface FormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  categoria: CategoriaFornecedor | '';
  observacoes: string;
}

const EMPTY_FORM: FormData = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  categoria: '',
  observacoes: '',
};

export default function FornecedoresPage() {
  const { data: fornecedores, isLoading } = useFornecedores();
  const { data: resumos } = useFornecedorResumo();
  const createMutation = useCreateFornecedor();
  const updateMutation = useUpdateFornecedor();
  const deactivateMutation = useDeactivateFornecedor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = (fornecedores ?? []).filter(f =>
    f.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    (f.cnpj ?? '').includes(search) ||
    (f.nome_fantasia ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const resumoMap = new Map((resumos ?? []).map(r => [r.fornecedor_id, r]));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (f: typeof fornecedores extends (infer T)[] | undefined ? T : never) => {
    if (!f) return;
    setEditingId(f.id);
    setForm({
      razao_social: f.razao_social,
      nome_fantasia: f.nome_fantasia ?? '',
      cnpj: f.cnpj ?? '',
      email: f.email ?? '',
      telefone: f.telefone ?? '',
      categoria: (f.categoria as CategoriaFornecedor) ?? '',
      observacoes: f.observacoes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.razao_social.trim()) return;
    const payload = {
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      categoria: (form.categoria || undefined) as CategoriaFornecedor | undefined,
      observacoes: form.observacoes.trim() || undefined,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e acompanhamento de fornecedores do projeto</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="resumo">Resumo Financeiro</TabsTrigger>
        </TabsList>

        {/* ── Lista ── */}
        <TabsContent value="lista">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} fornecedores</span>
          </div>

          <div className="bg-card border rounded-xl shadow-card overflow-auto">
            {isLoading ? (
              <div className="p-4"><SkeletonTable rows={8} cols={6} /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum fornecedor cadastrado</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>Cadastrar primeiro fornecedor</Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-medium">Razao Social</th>
                    <th className="py-2.5 px-4 font-medium">CNPJ</th>
                    <th className="py-2.5 px-4 font-medium">Categoria</th>
                    <th className="py-2.5 px-4 font-medium">Contato</th>
                    <th className="py-2.5 px-4 font-medium text-right">Valor Orcado</th>
                    <th className="py-2.5 px-4 font-medium text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const resumo = resumoMap.get(f.id);
                    return (
                      <tr key={f.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-medium">{f.razao_social}</div>
                          {f.nome_fantasia && <div className="text-xs text-muted-foreground">{f.nome_fantasia}</div>}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs">{f.cnpj ?? '—'}</td>
                        <td className="py-2.5 px-4">
                          {f.categoria ? (
                            <Badge variant="outline" className="text-xs">{CATEGORIA_FORNECEDOR_LABELS[f.categoria] ?? f.categoria}</Badge>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          {f.email && <div>{f.email}</div>}
                          {f.telefone && <div>{f.telefone}</div>}
                          {!f.email && !f.telefone && '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs">
                          {resumo ? formatCurrency(resumo.valor_total_orcado) : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deactivateMutation.mutate(f.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── Resumo Financeiro ── */}
        <TabsContent value="resumo">
          {!resumos?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Vincule fornecedores a itens do orcamento para ver o resumo</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resumos.map(r => (
                <Card key={r.fornecedor_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{r.razao_social}</CardTitle>
                    {r.cnpj && <p className="text-xs text-muted-foreground font-mono">{r.cnpj}</p>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Orcado</span>
                      <span className="font-mono font-medium">{formatCurrency(r.valor_total_orcado)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Lancamentos</span>
                      <span className="font-mono">{formatCurrency(r.valor_total_lancamentos)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-mono text-consumido">{formatCurrency(r.valor_total_pago)}</span>
                    </div>
                    {r.lancamentos_vencidos > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-destructive">Vencidos</span>
                        <Badge variant="destructive" className="text-[10px] h-4">{r.lancamentos_vencidos}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog Novo/Editar ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Razao Social *</Label>
              <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Nome Fantasia</Label>
                <Input value={form.nome_fantasia} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as CategoriaFornecedor }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_FORNECEDOR_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Observacoes</Label>
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.razao_social.trim()}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
