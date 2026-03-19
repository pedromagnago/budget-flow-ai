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
import { Save, Plus, Eye, EyeOff, CheckCircle2, AlertTriangle, Users, Layers, Bell, UserPlus, Mail, Lock, ShieldCheck } from 'lucide-react';
import {
  useCompanySettings, useUpdateCompany,
  useCategorias, useUpdateCategoria, useCreateCategoria,
  useUserRoles, useInviteUser, useUpdateUserRole,
  useAlertas, useMarkAlertaRead,
} from '@/hooks/useSettings';
import { useBudgetSummary } from '@/hooks/useBudget';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { STATUS_COLORS } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';

interface CompanyConfig {
  quinzena_atual?: string;
  limiar_desvio_alerta?: number;
  score_minimo_auto_approve?: number;
  auto_approve_ativo?: boolean;
  auto_approve_ativo?: boolean;
  incluir_exemplos_correcao?: boolean;
  portal_habilitado?: boolean;
  widgets_dashboard?: string[];
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
  const { data: budgetGroups, isLoading: loadingBudget } = useBudgetSummary();
  const { data: alertas, isLoading: loadingAlertas } = useAlertas();
  const markRead = useMarkAlertaRead();

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
  const [desvioLimiar, setDesvioLimiar] = useState(10);

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
      dias_sync_omie: syncDias,
      limiar_desvio_alerta: desvioLimiar / 100,
    };
    updateCompany.mutate({ config: newConfig as unknown as Json });
  };
  const saveOmieConfig = () => {
    const newConfig: CompanyConfig = { ...cfg, dias_sync_omie: syncDias };
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
          <TabsTrigger value="omie" className="text-xs">Omie</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">Categorias</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs">IA</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alertas</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">Orçamento</TabsTrigger>
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
            </div>
            <Button size="sm" onClick={saveProject} disabled={updateCompany.isPending}>
              <Save className="h-3.5 w-3.5 mr-2" /> Salvar
            </Button>
          </SectionCard>
        </TabsContent>

        {/* ── Omie ── */}
        <TabsContent value="omie">
          <SectionCard title="Integração Omie">
            <div className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label className="text-xs">Frequência de Sync (dias)</Label>
                <Input type="number" min={1} max={30} value={syncDias} onChange={e => setSyncDias(parseInt(e.target.value) || 1)} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quinzena Atual</Label>
                <Select defaultValue={cfg.quinzena_atual ?? 'Q1'} onValueChange={v => {
                  const newConfig = { ...cfg, quinzena_atual: v };
                  updateCompany.mutate({ config: newConfig as unknown as Json });
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={`Q${i + 1}`}>Q{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Para configurar App Key e App Secret do Omie, utilize os secrets do projeto Supabase.
              </p>
              <Button size="sm" onClick={saveOmieConfig} disabled={updateCompany.isPending}>
                <Save className="h-3.5 w-3.5 mr-2" /> Salvar
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Categorias ── */}
        <TabsContent value="categories">
          <SectionCard title="De-Para de Categorias" icon={Layers}>
            {loadingCats ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
                <div className="max-h-[350px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Apropriação Excel</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Depto. Omie</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Categoria Omie</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Auto</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categorias ?? []).map(c => (
                        <tr key={c.id} className="border-t hover:bg-muted/30">
                          <td className="py-1.5 px-3 text-xs">{c.apropriacao_excel}</td>
                          <td className="py-1.5 px-3 text-xs">{c.departamento_omie}</td>
                          <td className="py-1.5 px-3 text-xs text-muted-foreground">{c.categoria_omie ?? '—'}</td>
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Apropriação Excel" value={newCat.apropriacao_excel} onChange={e => setNewCat(p => ({ ...p, apropriacao_excel: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Depto. Omie" value={newCat.departamento_omie} onChange={e => setNewCat(p => ({ ...p, departamento_omie: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Categoria Omie" value={newCat.categoria_omie} onChange={e => setNewCat(p => ({ ...p, categoria_omie: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <Button size="sm" variant="outline" disabled={!newCat.apropriacao_excel || !newCat.departamento_omie} onClick={() => {
                    createCategoria.mutate(newCat);
                    setNewCat({ apropriacao_excel: '', departamento_omie: '', categoria_omie: '' });
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

        {/* ── Alertas ── */}
        <TabsContent value="alerts">
          <SectionCard title="Alertas do Sistema" icon={Bell}>
            {loadingAlertas ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (alertas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta registrado.</p>
            ) : (
              <div className="max-h-[400px] overflow-auto space-y-2">
                {(alertas ?? []).map(a => (
                  <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${a.lido ? 'opacity-60' : ''}`}>
                    {a.severidade === 'alta' || a.severidade === 'critica' ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{a.titulo}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {a.tipo}
                        </Badge>
                        {a.severidade && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${a.severidade === 'critica' ? 'bg-destructive/10 text-destructive' : a.severidade === 'alta' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                            {a.severidade}
                          </span>
                        )}
                      </div>
                      {a.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{a.mensagem}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(a.created_at!)}</p>
                    </div>
                    {!a.lido && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRead.mutate(a.id)}>
                        Marcar lido
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── Orçamento ── */}
        <TabsContent value="budget">
          <SectionCard title="Resumo do Orçamento">
            {loadingBudget ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Grupo</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Orçado</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Consumido</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Saldo</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(budgetGroups ?? []).map(g => (
                      <tr key={g.grupo_id} className="border-t hover:bg-muted/30">
                        <td className="py-1.5 px-3 text-xs font-medium">{g.grupo}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-xs">{formatCurrency(g.valor_orcado)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-xs">{formatCurrency(g.valor_consumido)}</td>
                        <td className={`py-1.5 px-3 text-right font-mono text-xs ${g.valor_saldo < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(g.valor_saldo)}
                        </td>
                        <td className={`py-1.5 px-3 text-right font-mono text-xs ${g.pct_consumido > 1 ? 'text-destructive font-bold' : ''}`}>
                          {(g.pct_consumido * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </Tabs>
    </div>
  );
}
