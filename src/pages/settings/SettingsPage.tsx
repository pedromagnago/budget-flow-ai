import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Plus, Eye, EyeOff, Bell, UserPlus, Mail, Lock, ShieldCheck, Layers, Users, CreditCard, Trash2, Pencil, Search, Truck } from 'lucide-react';
import {
  useCompanySettings, useUpdateCompany,
  useCategorias, useUpdateCategoria, useCreateCategoria,
  useUserRoles, useInviteUser, useUpdateUserRole,
} from '@/hooks/useSettings';
import { useFormasPagamento, useCreateFormaPagamento, useUpdateFormaPagamento, useDeleteFormaPagamento } from '@/hooks/useFormasPagamento';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeactivateFornecedor } from '@/hooks/useFornecedores';
import { CATEGORIA_FORNECEDOR_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { STATUS_COLORS } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';

interface CompanyConfig {
  quinzena_atual?: string;
  limiar_desvio_alerta?: number;
  score_minimo_auto_approve?: number;
  auto_approve_ativo?: boolean;
  incluir_exemplos_correcao?: boolean;
  portal_habilitado?: boolean;
  widgets_dashboard?: string[];
  notif_vencimento_dia?: boolean;
  notif_vencimento_semana?: boolean;
  notif_desvio_orcamento?: boolean;
  notif_desvio_percentual?: number;
  notif_conciliacao_pendente?: boolean;
}

function getConfig(config: Json | null): CompanyConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  return config as unknown as CompanyConfig;
}

export default function SettingsPage() {
  const { data: company, isLoading } = useCompanySettings();
  const updateCompany = useUpdateCompany();
  const { data: categorias, isLoading: loadingCats } = useCategorias();
  const updateCategoria = useUpdateCategoria();
  const createCategoria = useCreateCategoria();
  const { data: userRoles, isLoading: loadingRoles } = useUserRoles();
  const inviteUser = useInviteUser();
  const updateUserRole = useUpdateUserRole();
  const { data: formasPgto, isLoading: loadingFormas } = useFormasPagamento();
  const createForma = useCreateFormaPagamento();
  const updateForma = useUpdateFormaPagamento();
  const deleteForma = useDeleteFormaPagamento();
  const [newForma, setNewForma] = useState({ nome: '', tipo: 'pix', parcelas_padrao: '1' });
  const [editingFormaId, setEditingFormaId] = useState<string | null>(null);
  const [editFormaValues, setEditFormaValues] = useState({ nome: '', tipo: '', parcelas_padrao: '' });

  // ── Fornecedores state ──
  const { data: fornecedores, isLoading: loadingForn } = useFornecedores();
  const createFornecedor = useCreateFornecedor();
  const updateFornecedor = useUpdateFornecedor();
  const deactivateFornecedor = useDeactivateFornecedor();
  const [fornSearch, setFornSearch] = useState('');
  const [fornDialog, setFornDialog] = useState(false);
  const [editFornId, setEditFornId] = useState<string | null>(null);
  const [fornForm, setFornForm] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', categoria: '' as string, observacoes: '' });
  const EMPTY_FORN = { razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', categoria: '' as string, observacoes: '' };
  const filteredForn = (fornecedores ?? []).filter(f => f.razao_social.toLowerCase().includes(fornSearch.toLowerCase()) || (f.cnpj ?? '').includes(fornSearch));

  // ── Project form state ──
  const [projectForm, setProjectForm] = useState({ razao_social: '', nome_fantasia: '', municipio: '', estado: '', qtd_casas: 64, status: 'ativo' });
  useEffect(() => {
    if (company) setProjectForm({
      razao_social: company.razao_social ?? '',
      nome_fantasia: company.nome_fantasia ?? '',
      municipio: company.municipio ?? '',
      estado: company.estado ?? '',
      qtd_casas: company.qtd_casas ?? 64,
      status: company.status ?? 'ativo',
    });
  }, [company]);

  // ── Config state ──
  const cfg = getConfig(company?.config ?? null);
  const [iaConfig, setIaConfig] = useState({ score_min: 40, score_high: 85, score_auto: 95, auto_active: false, include_examples: true });
  const [desvioLimiar, setDesvioLimiar] = useState(10);
  const [notifConfig, setNotifConfig] = useState({
    notif_vencimento_dia: true,
    notif_vencimento_semana: true,
    notif_desvio_orcamento: true,
    notif_desvio_percentual: 10,
    notif_conciliacao_pendente: true,
  });

  useEffect(() => {
    if (company) {
      setIaConfig({
        score_min: 40,
        score_high: 85,
        score_auto: (cfg.score_minimo_auto_approve ?? 0.95) * 100,
        auto_active: cfg.auto_approve_ativo ?? false,
        include_examples: cfg.incluir_exemplos_correcao ?? true,
      });
      setDesvioLimiar((cfg.limiar_desvio_alerta ?? 0.10) * 100);
      setNotifConfig({
        notif_vencimento_dia: cfg.notif_vencimento_dia ?? true,
        notif_vencimento_semana: cfg.notif_vencimento_semana ?? true,
        notif_desvio_orcamento: cfg.notif_desvio_orcamento ?? true,
        notif_desvio_percentual: (cfg.notif_desvio_percentual ?? 10),
        notif_conciliacao_pendente: cfg.notif_conciliacao_pendente ?? true,
      });
    }
  }, [company]);

  // ── New category ──
  const [newCat, setNewCat] = useState({ apropriacao: '', departamento: '' });
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'operador' });
  const [showPassword, setShowPassword] = useState(false);
  const saveProject = () => updateCompany.mutate(projectForm);
  const saveIaConfig = () => {
    const newConfig: CompanyConfig = {
      ...cfg,
      score_minimo_auto_approve: iaConfig.score_auto / 100,
      auto_approve_ativo: iaConfig.auto_active,
      incluir_exemplos_correcao: iaConfig.include_examples,
      limiar_desvio_alerta: desvioLimiar / 100,
    };
    updateCompany.mutate({ config: newConfig as unknown as Json });
  };
  const saveQuinzenaConfig = (v: string) => {
    const newConfig = { ...cfg, quinzena_atual: v };
    updateCompany.mutate({ config: newConfig as unknown as Json });
  };

  const SectionCard = ({ children, title, icon: Icon }: { children: React.ReactNode; title: string; icon?: React.ElementType }) => (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full max-w-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Configurações</h1>

      <Tabs defaultValue="project" className="space-y-4">
         <TabsList className="bg-muted/50 h-9 flex-wrap">
          <TabsTrigger value="project" className="text-xs">Projeto</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">Categorias</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs">IA</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alertas</TabsTrigger>
          <TabsTrigger value="pagamento" className="text-xs">Formas de Pagamento</TabsTrigger>
          <TabsTrigger value="fornecedores" className="text-xs">Fornecedores</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Usuários</TabsTrigger>
        </TabsList>

        {/* ── Projeto ── */}
        <TabsContent value="project">
          <SectionCard title="Dados do Projeto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Razão Social</Label>
                <Input value={projectForm.razao_social} onChange={e => setProjectForm(p => ({ ...p, razao_social: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nome Fantasia</Label>
                <Input value={projectForm.nome_fantasia} onChange={e => setProjectForm(p => ({ ...p, nome_fantasia: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Município</Label>
                <Input value={projectForm.municipio} onChange={e => setProjectForm(p => ({ ...p, municipio: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Estado</Label>
                <Input value={projectForm.estado} onChange={e => setProjectForm(p => ({ ...p, estado: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Qtd. Casas</Label>
                <Input type="number" value={projectForm.qtd_casas} onChange={e => setProjectForm(p => ({ ...p, qtd_casas: parseInt(e.target.value) || 0 }))} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={projectForm.status} onValueChange={v => setProjectForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quinzena Atual</Label>
                <Select defaultValue={cfg.quinzena_atual ?? 'Q1'} onValueChange={saveQuinzenaConfig}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={`Q${i + 1}`}>Q{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={saveProject} disabled={updateCompany.isPending}>
              <Save className="h-3.5 w-3.5 mr-2" /> Salvar
            </Button>
          </SectionCard>
        </TabsContent>

        {/* ── Categorias ── */}
        <TabsContent value="categories">
          <SectionCard title="Mapeamento de Categorias" icon={Layers}>
            {loadingCats ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
                <div className="max-h-[350px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Apropriação</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Departamento</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Auto</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categorias ?? []).map(c => (
                        <tr key={c.id} className="border-t hover:bg-muted/30">
                          <td className="py-1.5 px-3 text-xs">{c.apropriacao}</td>
                          <td className="py-1.5 px-3 text-xs">{c.departamento}</td>
                          <td className="py-1.5 px-3 text-center">
                            <Switch
                              checked={c.match_automatico ?? true}
                              onCheckedChange={v => updateCategoria.mutate({ id: c.id, match_automatico: v })}
                              className="scale-75"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <Switch
                              checked={c.ativo ?? true}
                              onCheckedChange={v => updateCategoria.mutate({ id: c.id, ativo: v })}
                              className="scale-75"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Nova Categoria</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Apropriação" value={newCat.apropriacao} onChange={e => setNewCat(p => ({ ...p, apropriacao: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Departamento" value={newCat.departamento} onChange={e => setNewCat(p => ({ ...p, departamento: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <Button size="sm" variant="outline" disabled={!newCat.apropriacao || !newCat.departamento} onClick={() => {
                    createCategoria.mutate(newCat);
                    setNewCat({ apropriacao: '', departamento: '' });
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> Adicionar
                  </Button>
                </div>
              </>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── IA ── */}
        <TabsContent value="ia">
          <SectionCard title="Limiares da IA">
            <div className="space-y-6 max-w-md">
              <div className="space-y-2">
                <Label className="text-xs">Score Mínimo para Fila</Label>
                <Slider value={[iaConfig.score_min]} max={100} step={5} onValueChange={v => setIaConfig(p => ({ ...p, score_min: v[0] }))} />
                <p className="text-xs text-muted-foreground font-mono">{(iaConfig.score_min / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Score Alta Confiança</Label>
                <Slider value={[iaConfig.score_high]} max={100} step={5} onValueChange={v => setIaConfig(p => ({ ...p, score_high: v[0] }))} />
                <p className="text-xs text-muted-foreground font-mono">{(iaConfig.score_high / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Score Auto-Aprovação</Label>
                <Slider value={[iaConfig.score_auto]} max={100} step={5} onValueChange={v => setIaConfig(p => ({ ...p, score_auto: v[0] }))} />
                <p className="text-xs text-muted-foreground font-mono">{(iaConfig.score_auto / 100).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-aprovação ativa?</Label>
                <Switch checked={iaConfig.auto_active} onCheckedChange={v => setIaConfig(p => ({ ...p, auto_active: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incluir exemplos de correção no prompt?</Label>
                <Switch checked={iaConfig.include_examples} onCheckedChange={v => setIaConfig(p => ({ ...p, include_examples: v }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Limiar de Desvio para Alerta (%)</Label>
                <Slider value={[desvioLimiar]} max={50} step={1} onValueChange={v => setDesvioLimiar(v[0])} />
                <p className="text-xs text-muted-foreground font-mono">{desvioLimiar}%</p>
              </div>
              <Button size="sm" onClick={saveIaConfig} disabled={updateCompany.isPending}>
                <Save className="h-3.5 w-3.5 mr-2" /> Salvar Configurações IA
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Alertas e Notificações ── */}
        <TabsContent value="alerts">
          <SectionCard title="Alertas e Notificações" icon={Bell}>
            <div className="space-y-5 max-w-md">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Notificar sobre vencimentos do dia</Label>
                <Switch checked={notifConfig.notif_vencimento_dia} onCheckedChange={v => setNotifConfig(p => ({ ...p, notif_vencimento_dia: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Notificar sobre vencimentos da semana</Label>
                <Switch checked={notifConfig.notif_vencimento_semana} onCheckedChange={v => setNotifConfig(p => ({ ...p, notif_vencimento_semana: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Alertar quando desvio orçamentário superar</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={notifConfig.notif_desvio_percentual}
                      onChange={e => setNotifConfig(p => ({ ...p, notif_desvio_percentual: Number(e.target.value) || 0 }))}
                      className="h-7 w-20 text-xs"
                      min={1}
                      max={100}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <Switch checked={notifConfig.notif_desvio_orcamento} onCheckedChange={v => setNotifConfig(p => ({ ...p, notif_desvio_orcamento: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Notificar sobre conciliações pendentes</Label>
                <Switch checked={notifConfig.notif_conciliacao_pendente} onCheckedChange={v => setNotifConfig(p => ({ ...p, notif_conciliacao_pendente: v }))} />
              </div>
              <Button size="sm" onClick={() => {
                const newConfig: CompanyConfig = { ...cfg, ...notifConfig };
                updateCompany.mutate({ config: newConfig as unknown as Json });
              }} disabled={updateCompany.isPending}>
                <Save className="h-3.5 w-3.5 mr-2" /> Salvar Preferências
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Formas de Pagamento ── */}
        <TabsContent value="pagamento">
          <SectionCard title="Formas de Pagamento" icon={CreditCard}>
            {loadingFormas ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Nome</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Tipo</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Parcelas</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formasPgto ?? []).map(fp => (
                      <tr key={fp.id} className="border-t hover:bg-muted/30">
                        {editingFormaId === fp.id ? (
                          <>
                            <td className="py-1.5 px-3"><Input className="h-7 text-xs" value={editFormaValues.nome} onChange={e => setEditFormaValues(v => ({ ...v, nome: e.target.value }))} /></td>
                            <td className="py-1.5 px-3">
                              <Select value={editFormaValues.tipo} onValueChange={v => setEditFormaValues(p => ({ ...p, tipo: v }))}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                  <SelectItem value="transferencia">Transferência</SelectItem>
                                  <SelectItem value="cartao">Cartão</SelectItem>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="cheque">Cheque</SelectItem>
                                  <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-3 text-center"><Input type="number" className="h-7 text-xs w-16 mx-auto text-center" value={editFormaValues.parcelas_padrao} onChange={e => setEditFormaValues(v => ({ ...v, parcelas_padrao: e.target.value }))} /></td>
                            <td className="py-1.5 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                                  await updateForma.mutateAsync({ id: fp.id, nome: editFormaValues.nome, tipo: editFormaValues.tipo, parcelas_padrao: parseInt(editFormaValues.parcelas_padrao) || 1 });
                                  setEditingFormaId(null);
                                }}><span className="text-xs">✓</span></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingFormaId(null)}><span className="text-xs">✕</span></Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 px-3 text-xs font-medium">{fp.nome}</td>
                            <td className="py-1.5 px-3"><Badge variant="outline" className="text-[10px]">{fp.tipo.toUpperCase()}</Badge></td>
                            <td className="py-1.5 px-3 text-center font-mono text-xs">{fp.parcelas_padrao}x</td>
                            <td className="py-1.5 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                  setEditingFormaId(fp.id);
                                  setEditFormaValues({ nome: fp.nome, tipo: fp.tipo, parcelas_padrao: String(fp.parcelas_padrao) });
                                }}><Pencil className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteForma.mutate(fp.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add new forma */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Nova Forma de Pagamento</p>
                  <div className="flex gap-2 items-end">
                    <Input className="h-8 text-xs flex-1" placeholder="Nome" value={newForma.nome} onChange={e => setNewForma(v => ({ ...v, nome: e.target.value }))} />
                    <Select value={newForma.tipo} onValueChange={v => setNewForma(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="h-8 text-xs w-16" placeholder="Parc." value={newForma.parcelas_padrao} onChange={e => setNewForma(v => ({ ...v, parcelas_padrao: e.target.value }))} />
                    <Button size="sm" variant="outline" disabled={!newForma.nome || createForma.isPending} onClick={async () => {
                      await createForma.mutateAsync({ nome: newForma.nome, tipo: newForma.tipo, parcelas_padrao: parseInt(newForma.parcelas_padrao) || 1 });
                      setNewForma({ nome: '', tipo: 'pix', parcelas_padrao: '1' });
                    }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── Usuários ── */}
        <TabsContent value="users">
          <SectionCard title="Usuários e Papéis" icon={Users}>
            {loadingRoles ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (userRoles ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">User ID</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Papel</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Ativo</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Criado em</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(userRoles ?? []).map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="py-1.5 px-3 font-mono text-[10px] truncate max-w-[200px]">{r.user_id}</td>
                      <td className="py-1.5 px-3">
                        <Select
                          defaultValue={r.role}
                          onValueChange={v => updateUserRole.mutate({ id: r.id, role: v })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="operador">Operador</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <Switch
                          checked={r.active ?? true}
                          onCheckedChange={v => updateUserRole.mutate({ id: r.id, active: v })}
                          className="scale-75"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground">{r.created_at ? formatDate(r.created_at) : '—'}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`inline-block h-2 w-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Invite new user form ── */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> Convidar Novo Usuário
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="usuario@email.com"
                      value={newUser.email}
                      onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                      className="h-8 text-xs pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 6 caracteres"
                      value={newUser.password}
                      onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                      className="h-8 text-xs pl-8 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Papel</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!newUser.email || newUser.password.length < 6 || inviteUser.isPending}
                onClick={() => {
                  inviteUser.mutate(newUser, {
                    onSuccess: () => setNewUser({ email: '', password: '', role: 'operador' }),
                  });
                }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                {inviteUser.isPending ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Fornecedores ── */}
        <TabsContent value="fornecedores">
          <SectionCard title="Cadastro de Fornecedores" icon={Truck}>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={fornSearch} onChange={e => setFornSearch(e.target.value)} className="pl-9" />
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditFornId(null); setFornForm(EMPTY_FORN); setFornDialog(true); }}>
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </div>

            {loadingForn ? <Skeleton className="h-40 w-full" /> : filteredForn.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum fornecedor cadastrado</p>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="py-2 px-3 font-medium text-xs">Razão Social</th>
                      <th className="py-2 px-3 font-medium text-xs">CNPJ</th>
                      <th className="py-2 px-3 font-medium text-xs">Categoria</th>
                      <th className="py-2 px-3 font-medium text-xs">Contato</th>
                      <th className="py-2 px-3 font-medium text-xs text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForn.map(f => (
                      <tr key={f.id} className="border-t hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <div className="font-medium text-xs">{f.razao_social}</div>
                          {f.nome_fantasia && <div className="text-[10px] text-muted-foreground">{f.nome_fantasia}</div>}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">{f.cnpj ?? '—'}</td>
                        <td className="py-2 px-3 text-xs">
                          {f.categoria ? <Badge variant="outline" className="text-[10px]">{CATEGORIA_FORNECEDOR_LABELS[f.categoria as keyof typeof CATEGORIA_FORNECEDOR_LABELS] ?? f.categoria}</Badge> : '—'}
                        </td>
                        <td className="py-2 px-3 text-xs">{f.email ?? f.telefone ?? '—'}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditFornId(f.id);
                              setFornForm({ razao_social: f.razao_social, nome_fantasia: f.nome_fantasia ?? '', cnpj: f.cnpj ?? '', email: f.email ?? '', telefone: f.telefone ?? '', categoria: (f.categoria ?? '') as string, observacoes: f.observacoes ?? '' });
                              setFornDialog(true);
                            }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deactivateFornecedor.mutate(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fornecedor Dialog */}
            {fornDialog && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setFornDialog(false)}>
                <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="font-semibold">{editFornId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Razão Social *</Label>
                      <Input value={fornForm.razao_social} onChange={e => setFornForm(p => ({ ...p, razao_social: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Nome Fantasia</Label>
                        <Input value={fornForm.nome_fantasia} onChange={e => setFornForm(p => ({ ...p, nome_fantasia: e.target.value }))} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">CNPJ</Label>
                        <Input value={fornForm.cnpj} onChange={e => setFornForm(p => ({ ...p, cnpj: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input value={fornForm.email} onChange={e => setFornForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Telefone</Label>
                        <Input value={fornForm.telefone} onChange={e => setFornForm(p => ({ ...p, telefone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={fornForm.categoria} onValueChange={v => setFornForm(p => ({ ...p, categoria: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORIA_FORNECEDOR_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFornDialog(false)}>Cancelar</Button>
                    <Button size="sm" disabled={!fornForm.razao_social.trim()} onClick={async () => {
                      const payload = { razao_social: fornForm.razao_social.trim(), nome_fantasia: fornForm.nome_fantasia.trim() || undefined, cnpj: fornForm.cnpj.trim() || undefined, email: fornForm.email.trim() || undefined, telefone: fornForm.telefone.trim() || undefined, categoria: (fornForm.categoria || undefined) as any, observacoes: fornForm.observacoes.trim() || undefined };
                      if (editFornId) await updateFornecedor.mutateAsync({ id: editFornId, ...payload });
                      else await createFornecedor.mutateAsync(payload);
                      setFornDialog(false);
                    }}>{editFornId ? 'Salvar' : 'Cadastrar'}</Button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
