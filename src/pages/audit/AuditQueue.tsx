import { useState } from 'react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckSquare, Clock, TrendingUp, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditQueue, useAuditStats, type AuditFilters } from '@/hooks/useAuditQueue';
import { AuditDetailPanel } from '@/components/audit/AuditDetailPanel';

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}min`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function AuditQueue() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: items, isLoading } = useAuditQueue(filters);
  const { data: stats, isLoading: loadingStats } = useAuditStats();

  const selectedItem = items?.find(i => i.id === selectedId) ?? null;

  const INDICATORS = [
    { label: 'Pendentes', value: stats?.pendentes ?? 0, icon: Clock, accent: 'text-module-dashboard' },
    { label: 'Aprovadas Hoje', value: stats?.aprovadasHoje ?? 0, icon: CheckSquare, accent: 'text-consumido' },
    { label: 'Taxa Acerto IA', value: `${((stats?.taxaAcerto ?? 0) * 100).toFixed(0)}%`, icon: TrendingUp, accent: 'text-module-audit' },
    { label: 'Score Médio', value: `${((stats?.avgScore ?? 0) * 100).toFixed(0)}%`, icon: Zap, accent: 'text-saldo' },
  ];

  if (selectedItem) {
    return (
      <AuditDetailPanel
        item={selectedItem}
        onBack={() => setSelectedId(null)}
      />
    );
  }

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
              {loadingStats ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className={`font-mono text-xl font-bold ${ind.accent}`}>{ind.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="corrigido">Corrigido</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={
            filters.scoreMin !== undefined
              ? filters.scoreMin >= 0.85 ? 'high' : filters.scoreMin >= 0.6 ? 'medium' : 'low'
              : 'all'
          }
          onValueChange={v => {
            if (v === 'all') setFilters(f => ({ ...f, scoreMin: undefined, scoreMax: undefined }));
            else if (v === 'high') setFilters(f => ({ ...f, scoreMin: 0.85, scoreMax: undefined }));
            else if (v === 'medium') setFilters(f => ({ ...f, scoreMin: 0.60, scoreMax: 0.8499 }));
            else setFilters(f => ({ ...f, scoreMin: undefined, scoreMax: 0.5999 }));
          }}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Scores</SelectItem>
            <SelectItem value="high">Alta (≥85%)</SelectItem>
            <SelectItem value="medium">Média (60-84%)</SelectItem>
            <SelectItem value="low">Baixa (&lt;60%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue table */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <SkeletonTable rows={6} cols={7} />
          </div>
        ) : (
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
              {(items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                    Nenhum item na fila
                  </td>
                </tr>
              ) : (
                (items ?? []).map(item => (
                  <tr
                    key={item.id}
                    className="border-t hover:bg-muted/30 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="py-2 px-3 font-medium">{item.fornecedor_extraido ?? '—'}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {item.valor_extraido ? formatCurrency(item.valor_extraido) : '—'}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{item.departamento_proposto ?? '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <ScoreBadge score={item.score_confianca ?? 0} />
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{timeSince(item.created_at)}</td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={item.status_auditoria} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
