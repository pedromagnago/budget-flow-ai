import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ClipboardCheck, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useMedicoes, useCronogramaServicos, useMedicoesMetas, useAvancoFisico } from '@/hooks/useSchedule';
import { useSaveAvancoWithTriggers, type TriggerResult } from '@/hooks/usePlanejamento';
import { toast } from 'sonner';

interface ServiceEntry {
  id: string;
  nome: string;
  quantidade: number;
  grupoId: string | null;
  dataFimPlan: string | null;
  valorTotal: number;
  selected: boolean;
  casas: number;
  currentPct: number;
}

export function QuickActionBar() {
  const { data: medicoes } = useMedicoes();
  const { data: servicos } = useCronogramaServicos();
  const { data: metas } = useMedicoesMetas();
  const { data: avancos } = useAvancoFisico();
  const saveAvancoMut = useSaveAvancoWithTriggers();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [entries, setEntries] = useState<ServiceEntry[]>([]);
  const [obsGeral, setObsGeral] = useState('');
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [responsavel, setResponsavel] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [triggerResults, setTriggerResults] = useState<TriggerResult[]>([]);

  const currentMedicao = useMemo(() => {
    return (medicoes ?? []).find(m => m.status === 'em_andamento') ?? (medicoes ?? [])[0];
  }, [medicoes]);

  const { avancoGeral, metaGeral } = useMemo(() => {
    if (!servicos?.length) return { avancoGeral: 0, metaGeral: 0 };
    const totalValor = servicos.reduce((s, sv) => s + sv.valor_total, 0);
    if (totalValor === 0) return { avancoGeral: 0, metaGeral: 0 };

    const avancoMap: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!avancoMap[a.servico_id] || pct > avancoMap[a.servico_id]) avancoMap[a.servico_id] = pct;
    });

    let weightedReal = 0;
    servicos.forEach(sv => {
      weightedReal += ((avancoMap[sv.id] ?? 0) / 100) * sv.valor_total;
    });

    const metaMap: Record<string, number> = {};
    (metas ?? []).forEach(m => {
      metaMap[m.servico_id] = (metaMap[m.servico_id] ?? 0) + m.meta_percentual;
    });
    let weightedMeta = 0;
    servicos.forEach(sv => {
      weightedMeta += ((metaMap[sv.id] ?? 0) / 100) * sv.valor_total;
    });

    return {
      avancoGeral: (weightedReal / totalValor) * 100,
      metaGeral: (weightedMeta / totalValor) * 100,
    };
  }, [servicos, avancos, metas]);

  const diasRestantes = currentMedicao
    ? Math.max(0, Math.ceil((new Date(currentMedicao.data_fim).getTime() - Date.now()) / 86400000))
    : 0;

  function openWizard() {
    const avancoMap: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!avancoMap[a.servico_id] || pct > avancoMap[a.servico_id]) avancoMap[a.servico_id] = pct;
    });

    setEntries((servicos ?? []).map(sv => ({
      id: sv.id,
      nome: sv.nome,
      quantidade: sv.quantidade ?? 64,
      grupoId: null,
      dataFimPlan: null,
      valorTotal: sv.valor_total,
      selected: false,
      casas: 0,
      currentPct: avancoMap[sv.id] ?? 0,
    })));
    setStep(1);
    setObsGeral('');
    setDataRegistro(new Date().toISOString().split('T')[0]);
    setResponsavel('');
    setSavedCount(0);
    setTriggerResults([]);
    setWizardOpen(true);
  }

  const selectedEntries = entries.filter(e => e.selected && e.casas > 0);

  async function handleSaveAll() {
    if (!currentMedicao) return;
    const results: TriggerResult[] = [];
    let count = 0;

    for (const entry of selectedEntries) {
      try {
        const result = await saveAvancoMut.mutateAsync({
          servicoId: entry.id,
          servicoNome: entry.nome,
          medicaoNumero: currentMedicao.numero,
          casasConcluidas: entry.casas,
          qtdTotal: entry.quantidade,
          grupoId: entry.grupoId,
          dataFimPlan: entry.dataFimPlan,
          dataFimReal: null,
          valorTotal: entry.valorTotal,
        });
        count++;
        if (result.type !== 'none') results.push(result);
      } catch {
        toast.error(`Erro ao salvar ${entry.nome}`);
      }
    }

    setSavedCount(count);
    setTriggerResults(results);
    setStep(3);
  }

  const progressColor = avancoGeral >= metaGeral ? 'text-consumido' : avancoGeral >= metaGeral * 0.8 ? 'text-module-dashboard' : 'text-destructive';
  const barColor = avancoGeral >= metaGeral ? 'bg-consumido' : avancoGeral >= metaGeral * 0.8 ? 'bg-module-dashboard' : 'bg-destructive';

  if (!currentMedicao) return null;

  return (
    <>
      <div className="bg-card border rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 shadow-card">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            M{currentMedicao.numero}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {currentMedicao.data_inicio} a {currentMedicao.data_fim}
          </span>
          <Badge variant="secondary" className="text-[10px]">{diasRestantes}d restantes</Badge>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[300px]">
          <span className={`text-xs font-mono font-bold ${progressColor}`}>
            {avancoGeral.toFixed(1)}%
          </span>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(avancoGeral, 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">meta: {metaGeral.toFixed(1)}%</span>
        </div>

        <Button size="sm" className="ml-auto" onClick={openWizard}>
          <ClipboardCheck className="h-4 w-4 mr-1.5" />
          Registrar avanço de hoje
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {step === 1 && 'Passo 1 — Quais serviços avançaram hoje?'}
              {step === 2 && 'Passo 2 — Confirmar e observações'}
              {step === 3 && 'Passo 3 — Resultado'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3 mt-2">
              <p className="text-xs text-muted-foreground">Selecione os serviços que tiveram progresso e informe as casas concluídas.</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {entries.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <Checkbox
                      checked={entry.selected}
                      onCheckedChange={(checked) => {
                        const next = [...entries];
                        next[idx] = { ...entry, selected: !!checked };
                        setEntries(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entry.nome}</p>
                      <p className="text-[10px] text-muted-foreground">Atual: {entry.currentPct.toFixed(0)}% · Total: {entry.quantidade}</p>
                    </div>
                    {entry.selected && (
                      <Input
                        type="number"
                        className="h-7 w-20 text-xs text-right"
                        placeholder="Casas"
                        min={0}
                        max={entry.quantidade}
                        value={entry.casas || ''}
                        onChange={e => {
                          const next = [...entries];
                          next[idx] = { ...entry, casas: parseInt(e.target.value) || 0 };
                          setEntries(next);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {selectedEntries.length} serviço(s) · {selectedEntries.reduce((s, e) => s + e.casas, 0)} casas
                </span>
                <Button size="sm" disabled={selectedEntries.length === 0} onClick={() => setStep(2)}>
                  Próximo <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                {selectedEntries.map(e => (
                  <div key={e.id} className="flex justify-between text-xs">
                    <span>{e.nome}</span>
                    <span className="font-mono">{e.casas}/{e.quantidade} ({((e.casas / e.quantidade) * 100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data do registro</Label>
                <Input type="date" value={dataRegistro} onChange={e => setDataRegistro(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Responsável</Label>
                <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} className="h-8 text-sm" placeholder="Nome" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Observação geral (opcional)</Label>
                <Textarea value={obsGeral} onChange={e => setObsGeral(e.target.value)} rows={2} />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Voltar</Button>
                <Button size="sm" onClick={handleSaveAll} disabled={saveAvancoMut.isPending}>
                  {saveAvancoMut.isPending ? 'Salvando...' : 'Salvar todos'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 mt-2 text-center">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-consumido/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-consumido" />
                </div>
              </div>
              <p className="text-sm font-medium">{savedCount} registro(s) salvos com sucesso</p>

              {triggerResults.length > 0 && (
                <div className="text-left space-y-2">
                  {triggerResults.map((r, i) => (
                    <div key={i} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="font-medium">Desvio detectado</span>
                      </div>
                      <p className="text-muted-foreground">
                        {r.servicoNome}: {r.desvioPercent}% abaixo da meta ({r.diasDesvio}d desvio)
                      </p>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    setWizardOpen(false);
                    const tab = document.querySelector('[value="impacto"]') as HTMLElement;
                    tab?.click();
                  }}>
                    Ver impacto financeiro
                  </Button>
                </div>
              )}

              <Button size="sm" onClick={() => setWizardOpen(false)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
