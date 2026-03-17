import { useState, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Layers, Package, Calendar, BarChart3, ArrowRightLeft, DollarSign, Target
} from 'lucide-react';
import { parseCSV, COLUMN_PRESETS, useDataImport, type ImportTarget, type ParsedRow } from '@/hooks/useImport';

const TABS: { value: ImportTarget; label: string; icon: React.ElementType }[] = [
  { value: 'orcamento_grupos', label: 'Grupos', icon: Layers },
  { value: 'orcamento_items', label: 'Itens Orçam.', icon: Package },
  { value: 'cronograma_servicos', label: 'Serviços', icon: Calendar },
  { value: 'medicoes', label: 'Medições', icon: BarChart3 },
  { value: 'medicoes_metas', label: 'Metas', icon: Target },
  { value: 'omie_lancamentos', label: 'Lançamentos', icon: DollarSign },
  { value: 'categoria_depara', label: 'Categorias', icon: ArrowRightLeft },
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTarget>('orcamento_grupos');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { importData, importing, progress } = useDataImport();

  const preset = COLUMN_PRESETS[activeTab];
  const allDbCols = [...preset.required, ...preset.optional];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        toast.error('Arquivo vazio ou formato inválido');
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-map by fuzzy name match
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
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val as ImportTarget);
    resetFile();
  };

  const requiredMapped = preset.required.every(col => columnMap[col] && columnMap[col] !== '__skip__');

  const handleImport = async () => {
    if (!requiredMapped) {
      toast.error('Mapeie todas as colunas obrigatórias');
      return;
    }
    await importData(activeTab, csvRows, columnMap);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">Importação de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carregue arquivos CSV para popular as tabelas do sistema.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-muted/50 h-9 flex-wrap">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value}>
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-5 max-w-3xl">
              {/* Description */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <t.icon className="h-3.5 w-3.5" /> {preset.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {preset.required.map(c => (
                    <Badge key={c} variant="default" className="text-[10px]">{c} *</Badge>
                  ))}
                  {preset.optional.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>

              {/* Upload zone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
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

              {/* Column mapping */}
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
                            {isMapped ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : isRequired ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <Label className="text-xs truncate">
                              {dbCol} {isRequired && <span className="text-destructive">*</span>}
                            </Label>
                          </div>
                          <Select
                            value={columnMap[dbCol] ?? '__skip__'}
                            onValueChange={v => setColumnMap(m => ({ ...m, [dbCol]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="— pular —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">— pular —</SelectItem>
                              {csvHeaders.map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview */}
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

              {/* Import button */}
              {csvRows.length > 0 && (
                <div className="space-y-3">
                  {importing && <Progress value={progress} className="h-2" />}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleImport}
                      disabled={importing || !requiredMapped}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {importing ? `Importando... ${progress}%` : `Importar ${csvRows.length} registros`}
                    </Button>
                    {!requiredMapped && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Mapeie todas as colunas obrigatórias
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
