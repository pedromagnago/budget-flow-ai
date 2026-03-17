import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckSquare, Clock, TrendingUp, Zap } from 'lucide-react';

// Demo data
const DEMO_QUEUE = [
  { id: '1', fornecedor: 'PREVIBRAS LTDA', valor: 45600, departamento: '3.2 RADIER', score: 0.92, dataUpload: '2026-03-15', tempoFila: '2h', status: 'pendente' },
  { id: '2', fornecedor: 'JM FERRAGENS', valor: 12800, departamento: '3.3 PAREDES', score: 0.87, dataUpload: '2026-03-15', tempoFila: '3h', status: 'pendente' },
  { id: '3', fornecedor: 'MADEIREIRA SUL', valor: 8400, departamento: '3.2 RADIER', score: 0.62, dataUpload: '2026-03-14', tempoFila: '18h', status: 'pendente' },
  { id: '4', fornecedor: 'CONCRETEIRA RS', valor: 156000, departamento: '3.3 PAREDES', score: 0.45, dataUpload: '2026-03-14', tempoFila: '20h', status: 'pendente' },
];

const INDICATORS = [
  { label: 'Pendentes', value: '12', icon: Clock, accent: 'text-module-dashboard' },
  { label: 'Aprovadas Hoje', value: '7', icon: CheckSquare, accent: 'text-consumido' },
  { label: 'Taxa Acerto IA', value: '84%', icon: TrendingUp, accent: 'text-module-audit' },
  { label: 'Tempo Médio', value: '4.2h', icon: Zap, accent: 'text-saldo' },
];

export default function AuditQueue() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Fila de Auditoria</h1>

      {/* Indicators */}
      <div className="grid grid-cols-4 gap-4">
        {INDICATORS.map(ind => (
          <div key={ind.label} className="bg-card border rounded-xl p-4 shadow-card flex items-center gap-3">
            <ind.icon className={`h-5 w-5 ${ind.accent}`} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{ind.label}</p>
              <p className={`font-mono text-xl font-bold ${ind.accent}`}>{ind.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Queue table */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-3">Fornecedor</th>
              <th className="text-right py-2 px-3">Valor</th>
              <th className="text-left py-2 px-3">Departamento</th>
              <th className="text-center py-2 px-3">Score IA</th>
              <th className="text-left py-2 px-3">Upload</th>
              <th className="text-left py-2 px-3">Na Fila</th>
              <th className="text-center py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_QUEUE.map(item => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors duration-150 cursor-pointer">
                <td className="py-2 px-3 font-medium">{item.fornecedor}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(item.valor)}</td>
                <td className="py-2 px-3 text-muted-foreground">{item.departamento}</td>
                <td className="py-2 px-3 text-center"><ScoreBadge score={item.score} /></td>
                <td className="py-2 px-3 text-muted-foreground">{formatDate(item.dataUpload)}</td>
                <td className="py-2 px-3 font-mono text-xs">{item.tempoFila}</td>
                <td className="py-2 px-3 text-center"><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
