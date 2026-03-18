import { useState, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Layers, Calendar, BarChart3, ArrowRightLeft, DollarSign, Target,
  Download, Trash2
} from 'lucide-react';
import { parseCSV, COLUMN_PRESETS, useDataImport, type ImportTarget, type ParsedRow } from '@/hooks/useImport';
import { analyzeRows, generateTemplate, useSmartImport, type SmartImportSummary } from '@/hooks/useSmartImport';

// Other tabs (not budget)
type OtherTarget = Exclude<ImportTarget, 'orcamento_grupos' | 'orcamento_items'>;

const OTHER_TABS: { value: OtherTarget; label: string; icon: React.ElementType }[] = [
  { value: 'cronograma_servicos', label: 'Serviços', icon: Calendar },
  { value: 'medicoes', label: 'Medições', icon: BarChart3 },
  { value: 'medicoes_metas', label: 'Metas', icon: Target },
  { value: 'omie_lancamentos', label: 'Lançamentos', icon: DollarSign },
  { value: 'categoria_depara', label: 'Categorias', icon: ArrowRightLeft },
];

// ─── Budget Import Section ───
function BudgetImportSection() {
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState<SmartImportSummary | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { importBudget, importing, progress } = useSmartImport();

  const processData = (headers: string[], rows: ParsedRow[], name: string) => {
    if (headers.length === 0) {
      toast.error('Arquivo vazio ou formato inválido');
      return;
    }
    setCsvHeaders(headers);
    setCsvRows(rows);
    setFileName(name);
    setSummary(analyzeRows(headers, rows));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (jsonData.length === 0) { toast.error('Planilha vazia'); return; }
        const headers = Object.keys(jsonData[0]);
        const rows: ParsedRow[] = jsonData.map(row => {
          const parsed: ParsedRow = {};
          headers.forEach(h => { parsed[h] = String(row[h] ?? ''); });
          return parsed;
        });
        processData(headers, rows, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCSV(text);
        processData(headers, rows, file.name);
      };
      reader.readAsText(file);
    }
  };

  const resetFile = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setFileName('');
    setSummary(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_orcamento.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async () => {
    if (!summary || summary.validationErrors.some(e => e.row === 0)) return;
    await importBudget(csvHeaders, csvRows, clearExisting);
    resetFile();
  };

  const handleImport = () => {
    if (clearExisting) {
      setShowClearConfirm(true);
    } else {
      doImport();
    }
  };

  const criticalErrors = summary?.validationErrors.filter(e => e.row === 0) ?? [];
  const rowErrors = summary?.validationErrors.filter(e => e.row > 0) ?? [];
  const canImport = summary && criticalErrors.length === 0 && summary.grupos.length > 0;

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Importação unificada de orçamento (Grupos + Itens)
          </p>
          <p className="text-xs text-muted-foreground">
            Suba um CSV com uma linha por item. Grupos serão detectados automaticamente.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5" /> Template
        </Button>
      </div>

      {/* Required columns */}
      <div className="flex flex-wrap gap-1.5">
        {['grupo', 'item', 'apropriacao', 'valor_orcado'].map(c => (
          <Badge key={c} variant="default" className="text-[10px]">{c} *</Badge>
        ))}
        {['tipo', 'unidade', 'qtd_unit', 'qtd_total', 'custo_unitario', 'custo_casa', 'Q1…Q30'].map(c => (
          <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
        ))}
      </div>

      {/* Upload zone */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{fileName}</span>
            <Badge variant="secondary" className="text-[10px]">{csvRows.length} linhas</Badge>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={e => { e.stopPropagation(); resetFile(); }}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clique ou arraste um arquivo CSV</p>
            <p className="text-[10px] text-muted-foreground">Separador: vírgula ou ponto-e-vírgula</p>
          </div>
        )}
      </div>

      {/* Analysis summary */}
      {summary && (
        <div className="space-y-4">
          {/* Critical errors */}
          {criticalErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
              {criticalErrors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {e.message}
                </p>
              ))}
            </div>
          )}

          {/* Groups detected */}
          {summary.grupos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {summary.grupos.length} grupos detectados · {summary.totalItems} itens
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.grupos.map(g => (
                  <div key={g.nome} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">{g.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{g.itemCount} itens</p>
                    </div>
                    <p className="text-xs font-mono">
                      {g.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quinzena columns */}
          {summary.quinzenaColumns.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {summary.quinzenaColumns.length} colunas de quinzena detectadas ({summary.quinzenaColumns.join(', ')})
            </p>
          )}

          {/* Row-level warnings */}
          {rowErrors.length > 0 && rowErrors.length <= 10 && (
            <div className="bg-muted/60 border border-border rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground">{rowErrors.length} avisos</p>
              {rowErrors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">
                  Linha {e.row}: {e.field} — {e.message}
                </p>
              ))}
              {rowErrors.length > 5 && (
                <p className="text-[10px] text-muted-foreground">… e mais {rowErrors.length - 5}</p>
              )}
            </div>
          )}

          {/* Preview table */}
          {csvRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Prévia (primeiras 5 linhas)
              </p>
              <div className="overflow-auto max-h-48 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      {csvHeaders.map(h => (
                        <th key={h} className="text-left py-1.5 px-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {csvHeaders.map(h => (
                          <td key={h} className="py-1 px-2 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import controls */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={e => setClearExisting(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              Limpar orçamento existente antes de importar
            </label>

            {importing && <Progress value={progress} className="h-2" />}
            <div className="flex items-center gap-3">
              <Button onClick={handleImport} disabled={importing || !canImport} className="gap-2">
                <Upload className="h-4 w-4" />
                {importing
                  ? `Importando... ${progress}%`
                  : `Importar ${summary.grupos.length} grupos e ${summary.totalItems} itens`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generic Tab (other tables) ───
function GenericImportTab({ target }: { target: OtherTarget }) {
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { importData, importing, progress } = useDataImport();

  const preset = COLUMN_PRESETS[target];
  const allDbCols = [...preset.required, ...preset.optional];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) { toast.error('Arquivo vazio ou formato inválido'); return; }
      setCsvHeaders(headers);
      setCsvRows(rows);
      const autoMap: Record<string, string> = {};
      allDbCols.forEach(dbCol => {
        const normalized = dbCol.toLowerCase().replace(/_/g, '');
        const match = headers.find(h => h.toLowerCase().replace(/[_ ]/g, '') === normalized);
        if (match) autoMap[dbCol] = match;
      });
      setColumnMap(autoMap);
    };
    reader.readAsText(file);
  };

  const resetFile = () => {
    setCsvHeaders([]); setCsvRows([]); setColumnMap({}); setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const requiredMapped = preset.required.every(col => columnMap[col] && columnMap[col] !== '__skip__');

  const handleImport = async () => {
    if (!requiredMapped) { toast.error('Mapeie todas as colunas obrigatórias'); return; }
    await importData(target, csvRows, columnMap);
  };

  const tabMeta = OTHER_TABS.find(t => t.value === target);
  const Icon = tabMeta?.icon ?? Layers;

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-5 max-w-3xl">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" /> {preset.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {preset.required.map(c => <Badge key={c} variant="default" className="text-[10px]">{c} *</Badge>)}
          {preset.optional.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
        </div>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{fileName}</span>
            <Badge variant="secondary" className="text-[10px]">{csvRows.length} linhas</Badge>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={e => { e.stopPropagation(); resetFile(); }}>Trocar</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clique ou arraste um arquivo CSV</p>
            <p className="text-[10px] text-muted-foreground">Separador: vírgula ou ponto-e-vírgula</p>
          </div>
        )}
      </div>

      {csvHeaders.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mapeamento de Colunas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allDbCols.map(dbCol => {
              const isRequired = preset.required.includes(dbCol);
              const isMapped = columnMap[dbCol] && columnMap[dbCol] !== '__skip__';
              return (
                <div key={dbCol} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-40 shrink-0">
                    {isMapped ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> : isRequired ? <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" /> : <div className="h-3.5 w-3.5 shrink-0" />}
                    <Label className="text-xs truncate">{dbCol} {isRequired && <span className="text-destructive">*</span>}</Label>
                  </div>
                  <Select value={columnMap[dbCol] ?? '__skip__'} onValueChange={v => setColumnMap(m => ({ ...m, [dbCol]: v }))}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="— pular —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— pular —</SelectItem>
                      {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {csvRows.length > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prévia (primeiras 5 linhas)</p>
            <div className="overflow-auto max-h-48 border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>{csvHeaders.map(h => <th key={h} className="text-left py-1.5 px-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">{csvHeaders.map(h => <td key={h} className="py-1 px-2 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3">
            {importing && <Progress value={progress} className="h-2" />}
            <div className="flex items-center gap-3">
              <Button onClick={handleImport} disabled={importing || !requiredMapped} className="gap-2">
                <Upload className="h-4 w-4" />
                {importing ? `Importando... ${progress}%` : `Importar ${csvRows.length} registros`}
              </Button>
              {!requiredMapped && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Mapeie todas as colunas obrigatórias</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───
type ActiveTab = 'orcamento' | OtherTarget;

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orcamento');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">Importação de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carregue arquivos CSV para popular as tabelas do sistema.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ActiveTab)} className="space-y-4">
        <TabsList className="bg-muted/50 h-9 flex-wrap">
          <TabsTrigger value="orcamento" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Orçamento
          </TabsTrigger>
          {OTHER_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orcamento">
          <BudgetImportSection />
        </TabsContent>

        {OTHER_TABS.map(t => (
          <TabsContent key={t.value} value={t.value}>
            <GenericImportTab target={t.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
