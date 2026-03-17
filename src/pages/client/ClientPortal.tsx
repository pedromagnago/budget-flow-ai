import { Upload, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';

// Demo
const DEMO_DOCS = [
  { id: '1', nome: 'NF_PREVIBRAS_MAR2026.pdf', data: '2026-03-15', status: 'classificado' },
  { id: '2', nome: 'PEDIDO_JM_FERRAGENS.pdf', data: '2026-03-14', status: 'aprovado' },
  { id: '3', nome: 'COMPROVANTE_CONCRETO.jpg', data: '2026-03-12', status: 'executado' },
];

const DEMO_GROUPS = [
  { nome: 'RADIER', orcado: 668329, consumido: 128000, saldo: 540329 },
  { nome: 'PAREDES', orcado: 2555747, consumido: 320000, saldo: 2235747 },
  { nome: 'COBERTURA', orcado: 378887, consumido: 0, saldo: 378887 },
  { nome: 'ELÉTRICA', orcado: 235498, consumido: 5805, saldo: 229693 },
];

export default function ClientPortal() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Portal do Cliente</h1>

      <GoldenRuleBar orcado={20700000} consumido={3450000} saldo={17250000} />

      {/* Upload area */}
      <div className="bg-card border-2 border-dashed rounded-xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Arraste documentos ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, XML — máximo 10MB</p>
        <Button variant="outline" className="mt-4" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Selecionar Arquivo
        </Button>
      </div>

      {/* Document history */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Histórico de Envios
        </p>
        <div className="bg-card border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-2 px-3">Arquivo</th>
                <th className="text-left py-2 px-3">Data</th>
                <th className="text-center py-2 px-3">Status</th>
                <th className="text-center py-2 px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DOCS.map(doc => (
                <tr key={doc.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc.nome}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{formatDate(doc.data)}</td>
                  <td className="py-2 px-3 text-center"><StatusBadge status={doc.status} /></td>
                  <td className="py-2 px-3 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget by group */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Orçamento por Grupo
        </p>
        <div className="bg-card border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-2 px-3">Grupo</th>
                <th className="text-right py-2 px-3">Orçado</th>
                <th className="text-right py-2 px-3">Consumido</th>
                <th className="text-right py-2 px-3">Saldo</th>
                <th className="text-right py-2 px-3">%</th>
                <th className="py-2 px-3 w-32">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_GROUPS.map(g => {
                const pct = g.orcado > 0 ? g.consumido / g.orcado : 0;
                return (
                  <tr key={g.nome} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium">{g.nome}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(g.orcado)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-consumido">{formatCurrency(g.consumido)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-saldo">{formatCurrency(g.saldo)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatPercent(pct)}</td>
                    <td className="py-2 px-3">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-consumido transition-all" style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
