import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2, MapPin, Layers, Truck, CalendarDays, ClipboardCheck,
  ChevronLeft, ChevronRight, Check, Upload, Plus, Trash2,
} from 'lucide-react';
import { parseCSV, COLUMN_PRESETS } from '@/hooks/useImport';
import { CATEGORIA_FORNECEDOR_LABELS } from '@/lib/constants';
import type { CategoriaFornecedor } from '@/types';

// ── Steps ──
const STEPS = [
  { key: 'dados', label: 'Dados do Projeto', icon: Building2 },
  { key: 'etapas', label: 'Etapas (Grupos)', icon: Layers },
  { key: 'fornecedores', label: 'Fornecedores', icon: Truck },
  { key: 'cronograma', label: 'Cronograma', icon: CalendarDays },
  { key: 'revisao', label: 'Revisão', icon: ClipboardCheck },
] as const;

type StepKey = typeof STEPS[number]['key'];

// ── Local state types ──
interface ProjetoData {
  razao_social: string;
  nome_fantasia: string;
  municipio: string;
  estado: string;
  qtd_casas: number;
}

interface EtapaLocal {
  nome: string;
  valor_total: string;
}

interface FornecedorLocal {
  razao_social: string;
  cnpj: string;
  categoria: CategoriaFornecedor | '';
  telefone: string;
}

interface ServicoLocal {
  nome: string;
  valor_total: string;
  quantidade: string;
  etapa_index: number;
  data_inicio: string;
  data_fim: string;
}

export default function NovoProjetoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<StepKey>('dados');
  const [saving, setSaving] = useState(false);

  // Step 1
  const [projeto, setProjeto] = useState<ProjetoData>({
    razao_social: '', nome_fantasia: '', municipio: '', estado: '', qtd_casas: 64,
  });

  // Step 2
  const [etapas, setEtapas] = useState<EtapaLocal[]>([]);
  const [novaEtapa, setNovaEtapa] = useState<EtapaLocal>({ nome: '', valor_total: '' });

  // Step 3
  const [fornecedores, setFornecedores] = useState<FornecedorLocal[]>([]);
  const [novoForn, setNovoForn] = useState<FornecedorLocal>({ razao_social: '', cnpj: '', categoria: '', telefone: '' });

  // Step 4
  const [servicos, setServicos] = useState<ServicoLocal[]>([]);
  const [novoServ, setNovoServ] = useState<ServicoLocal>({ nome: '', valor_total: '', quantidade: '64', etapa_index: 0, data_inicio: '', data_fim: '' });

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const canAdvance = stepIndex < STEPS.length - 1;
  const canGoBack = stepIndex > 0;

  const goNext = () => canAdvance && setStep(STEPS[stepIndex + 1].key);
  const goBack = () => canGoBack && setStep(STEPS[stepIndex - 1].key);

  // ── CSV Import helper ──
  const handleCSVUpload = useCallback((target: 'etapas' | 'fornecedores', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows } = parseCSV(text);
      if (target === 'etapas') {
        const parsed = rows.map(r => ({
          nome: r['nome'] ?? r['Nome'] ?? '',
          valor_total: r['valor_total'] ?? r['Valor'] ?? '0',
        })).filter(r => r.nome);
        setEtapas(prev => [...prev, ...parsed]);
        toast.success(`${parsed.length} etapas importadas`);
      } else {
        const parsed = rows.map(r => ({
          razao_social: r['razao_social'] ?? r['Razão Social'] ?? r['fornecedor'] ?? '',
          cnpj: r['cnpj'] ?? r['CNPJ'] ?? '',
          categoria: '' as CategoriaFornecedor | '',
          telefone: r['telefone'] ?? r['Telefone'] ?? '',
        })).filter(r => r.razao_social);
        setFornecedores(prev => [...prev, ...parsed]);
        toast.success(`${parsed.length} fornecedores importados`);
      }
    };
    reader.readAsText(file);
  }, []);

  // ── Save everything to Supabase ──
  const handleFinalize = async () => {
    if (!projeto.razao_social.trim()) { toast.error('Preencha a razão social'); return; }
    setSaving(true);
    try {
      // 1. Create company
      const { data: comp, error: compErr } = await supabase
        .from('companies')
        .insert({
          razao_social: projeto.razao_social,
          nome_fantasia: projeto.nome_fantasia || null,
          municipio: projeto.municipio || null,
          estado: projeto.estado || null,
          qtd_casas: projeto.qtd_casas,
        })
        .select('id')
        .single();
      if (compErr || !comp) throw compErr ?? new Error('Erro ao criar projeto');
      const companyId = comp.id;

      // 2. Assign current user as super_admin
      if (user?.id) {
        await supabase.from('user_roles').insert({
          user_id: user.id,
          company_id: companyId,
          role: 'super_admin',
        });
      }

      // 3. Create etapas (orcamento_grupos)
      const grupoInserts = etapas.map(e => ({
        company_id: companyId,
        nome: e.nome,
        valor_total: parseFloat(e.valor_total) || 0,
      }));
      let grupoIds: string[] = [];
      if (grupoInserts.length > 0) {
        const { data: gData, error: gErr } = await supabase
          .from('orcamento_grupos' as never)
          .insert(grupoInserts as never[])
          .select('id' as never) as unknown as { data: { id: string }[] | null; error: Error | null };
        if (gErr) throw gErr;
        grupoIds = (gData ?? []).map(g => g.id);
      }

      // 4. Create fornecedores
      if (fornecedores.length > 0) {
        const fornInserts = fornecedores.map(f => ({
          company_id: companyId,
          razao_social: f.razao_social,
          cnpj: f.cnpj || null,
          categoria: f.categoria || null,
          telefone: f.telefone || null,
        }));
        await supabase.from('fornecedores' as never).insert(fornInserts as never[]);
      }

      // 5. Create servicos (cronograma)
      if (servicos.length > 0) {
        const servInserts = servicos.map(s => {
          const qty = parseInt(s.quantidade) || 64;
          const vt = parseFloat(s.valor_total) || 0;
          return {
            company_id: companyId,
            nome: s.nome,
            valor_total: vt,
            quantidade: qty,
            preco_unitario: qty > 0 ? vt / qty : 0,
            grupo_id: grupoIds[s.etapa_index] ?? null,
            data_inicio_plan: s.data_inicio || null,
            data_fim_plan: s.data_fim || null,
          };
        });
        const { error: sErr } = await supabase.from('cronograma_servicos').insert(servInserts);
        if (sErr) throw sErr;
      }

      toast.success('Projeto criado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const totalOrcamento = etapas.reduce((s, e) => s + (parseFloat(e.valor_total) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">Novo Projeto</h1>
        <p className="text-sm text-muted-foreground mt-1">Siga os passos para configurar seu projeto de obra</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone = i < stepIndex;
          return (
            <button
              key={s.key}
              onClick={() => i <= stepIndex && setStep(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                isActive ? 'bg-primary text-primary-foreground font-medium'
                : isDone ? 'bg-consumido/10 text-consumido cursor-pointer'
                : 'bg-muted text-muted-foreground'
              }`}
            >
              {isDone ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6 pb-6 space-y-6">

          {/* ── STEP 1: Dados ── */}
          {step === 'dados' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Dados do Projeto</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Razão Social *</Label>
                  <Input value={projeto.razao_social} onChange={e => setProjeto(p => ({ ...p, razao_social: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome Fantasia</Label>
                  <Input value={projeto.nome_fantasia} onChange={e => setProjeto(p => ({ ...p, nome_fantasia: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Município</Label>
                  <Input value={projeto.municipio} onChange={e => setProjeto(p => ({ ...p, municipio: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado</Label>
                  <Input value={projeto.estado} onChange={e => setProjeto(p => ({ ...p, estado: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade de Unidades (Casas)</Label>
                  <Input type="number" value={projeto.qtd_casas} onChange={e => setProjeto(p => ({ ...p, qtd_casas: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Etapas ── */}
          {step === 'etapas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Etapas do Orçamento</h2>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCSVUpload('etapas', e.target.files[0])} />
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted"><Upload className="h-3 w-3" /> Importar CSV</Badge>
                </label>
              </div>

              {etapas.length > 0 && (
                <div className="space-y-2">
                  {etapas.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                      <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                      <span className="flex-1 text-sm font-medium">{e.nome}</span>
                      <span className="text-sm font-mono">R$ {parseFloat(e.valor_total).toLocaleString('pt-BR')}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEtapas(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right text-xs font-mono text-muted-foreground">
                    Total: R$ {totalOrcamento.toLocaleString('pt-BR')}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome da Etapa</Label>
                  <Input placeholder="Ex: Fundação, Alvenaria..." value={novaEtapa.nome} onChange={e => setNovaEtapa(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Valor Total</Label>
                  <Input type="number" placeholder="0.00" value={novaEtapa.valor_total} onChange={e => setNovaEtapa(p => ({ ...p, valor_total: e.target.value }))} />
                </div>
                <Button size="sm" variant="outline" disabled={!novaEtapa.nome.trim()} onClick={() => {
                  setEtapas(prev => [...prev, novaEtapa]);
                  setNovaEtapa({ nome: '', valor_total: '' });
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Fornecedores ── */}
          {step === 'fornecedores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Fornecedores</h2>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCSVUpload('fornecedores', e.target.files[0])} />
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted"><Upload className="h-3 w-3" /> Importar CSV</Badge>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Opcional — você pode cadastrar fornecedores depois.</p>

              {fornecedores.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {fornecedores.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm font-medium">{f.razao_social}</span>
                      {f.cnpj && <span className="text-xs font-mono text-muted-foreground">{f.cnpj}</span>}
                      {f.categoria && <Badge variant="outline" className="text-[10px]">{CATEGORIA_FORNECEDOR_LABELS[f.categoria] ?? f.categoria}</Badge>}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFornecedores(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Razão Social</Label>
                  <Input value={novoForn.razao_social} onChange={e => setNovoForn(p => ({ ...p, razao_social: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={novoForn.cnpj} onChange={e => setNovoForn(p => ({ ...p, cnpj: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={novoForn.categoria} onValueChange={v => setNovoForn(p => ({ ...p, categoria: v as CategoriaFornecedor }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_FORNECEDOR_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" disabled={!novoForn.razao_social.trim()} onClick={() => {
                  setFornecedores(prev => [...prev, novoForn]);
                  setNovoForn({ razao_social: '', cnpj: '', categoria: '', telefone: '' });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Cronograma ── */}
          {step === 'cronograma' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Cronograma Físico</h2>
              </div>
              <p className="text-xs text-muted-foreground">Opcional — defina os serviços e datas planejadas. Você pode complementar depois.</p>

              {servicos.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {servicos.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 text-xs">
                      <span className="flex-1 font-medium">{s.nome}</span>
                      <span className="font-mono">R$ {parseFloat(s.valor_total).toLocaleString('pt-BR')}</span>
                      {etapas[s.etapa_index] && <Badge variant="outline" className="text-[10px]">{etapas[s.etapa_index].nome}</Badge>}
                      {s.data_inicio && <span className="text-muted-foreground">{s.data_inicio}</span>}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setServicos(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Nome do Serviço</Label>
                  <Input value={novoServ.nome} onChange={e => setNovoServ(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Total</Label>
                  <Input type="number" value={novoServ.valor_total} onChange={e => setNovoServ(p => ({ ...p, valor_total: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Etapa</Label>
                  <Select value={String(novoServ.etapa_index)} onValueChange={v => setNovoServ(p => ({ ...p, etapa_index: parseInt(v) }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {etapas.map((e, i) => (
                        <SelectItem key={i} value={String(i)}>{e.nome}</SelectItem>
                      ))}
                      {etapas.length === 0 && <SelectItem value="0" disabled>Cadastre etapas primeiro</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={novoServ.data_inicio} onChange={e => setNovoServ(p => ({ ...p, data_inicio: e.target.value }))} />
                </div>
                <Button size="sm" variant="outline" disabled={!novoServ.nome.trim()} onClick={() => {
                  setServicos(prev => [...prev, novoServ]);
                  setNovoServ({ nome: '', valor_total: '', quantidade: '64', etapa_index: novoServ.etapa_index, data_inicio: '', data_fim: '' });
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Revisão ── */}
          {step === 'revisao' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Revisão e Confirmação</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Projeto</p>
                  <p className="text-sm font-medium">{projeto.razao_social || '(sem nome)'}</p>
                  {projeto.nome_fantasia && <p className="text-xs text-muted-foreground">{projeto.nome_fantasia}</p>}
                  <p className="text-xs text-muted-foreground">{[projeto.municipio, projeto.estado].filter(Boolean).join(' — ') || '—'}</p>
                  <p className="text-xs font-mono">{projeto.qtd_casas} unidades</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Resumo</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Etapas</p>
                      <p className="font-bold text-lg">{etapas.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Orçamento Total</p>
                      <p className="font-bold text-lg font-mono">R$ {totalOrcamento.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fornecedores</p>
                      <p className="font-bold text-lg">{fornecedores.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Serviços</p>
                      <p className="font-bold text-lg">{servicos.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {etapas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Etapas</p>
                  <div className="flex flex-wrap gap-2">
                    {etapas.map((e, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {e.nome} — R$ {parseFloat(e.valor_total).toLocaleString('pt-BR')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm text-primary font-medium">
                  Ao confirmar, o projeto será criado e você será redirecionado para o painel geral.
                  Depois, use a tela de Importação para completar os dados (itens de orçamento, medições, lançamentos).
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={!canGoBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex gap-2">
          {step !== 'revisao' ? (
            <Button onClick={goNext} disabled={step === 'dados' && !projeto.razao_social.trim()}>
              Avançar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinalize} disabled={saving || !projeto.razao_social.trim()}>
              {saving ? 'Salvando...' : 'Criar Projeto'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
