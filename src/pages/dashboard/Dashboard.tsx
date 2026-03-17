import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';

// Demo data
const DEMO = {
  orcado: 20_700_000,
  consumido: 3_450_000,
  saldo: 17_250_000,
  pctExecucao: 0.167,
};

const SUMMARY_CARDS = [
  { label: 'Total Orçado', value: DEMO.orcado, icon: DollarSign, accent: 'text-orcado' },
  { label: 'Consumido (Real)', value: DEMO.consumido, icon: TrendingUp, accent: 'text-consumido' },
  { label: 'Saldo Futuro', value: DEMO.saldo, icon: BarChart3, accent: 'text-saldo' },
  { label: '% Execução', value: DEMO.pctExecucao, icon: AlertTriangle, accent: 'text-module-dashboard', isPercent: true },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">
          Status do Projeto: 64 Casas — Quinzena 01
        </h1>
        <p className="text-sm text-muted-foreground mt-1">São Francisco de Paula/RS — Início: 09/03/2026</p>
      </div>

      {/* Golden Rule */}
      <GoldenRuleBar orcado={DEMO.orcado} consumido={DEMO.consumido} saldo={DEMO.saldo} />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {SUMMARY_CARDS.map(card => (
          <div key={card.label} className="bg-card border rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`h-4 w-4 ${card.accent}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {card.label}
              </p>
            </div>
            <p className={`font-mono text-2xl font-bold tabular-nums ${card.accent}`}>
              {card.isPercent ? formatPercent(card.value as number) : formatCurrency(card.value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-card h-80">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Orçado × Realizado — Top 15 Grupos
          </p>
          <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
            Gráfico Recharts (Etapa 3)
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card h-80">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Curva S — Acumulado por Quinzena
          </p>
          <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
            Gráfico Recharts (Etapa 3)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-card h-64">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Top 5 Desvios
          </p>
          <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
            Tabela (Etapa 3)
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card h-64">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Fluxo de Caixa Projetado
          </p>
          <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
            Gráfico Área (Etapa 3)
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card h-64 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Fila de Auditoria
            </p>
            <p className="font-mono text-lg font-bold">12 pendentes</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Avanço Físico
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-consumido w-[12%] transition-all" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">12% concluído</p>
          </div>
        </div>
      </div>
    </div>
  );
}
