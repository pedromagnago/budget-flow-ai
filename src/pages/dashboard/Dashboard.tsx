import { GoldenRuleBar } from '@/components/shared/GoldenRuleBar';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useOrcamentoGrupos } from '@/hooks/useBudget';
import { useAuditStats } from '@/hooks/useAuditQueue';
import { useMedicoes } from '@/hooks/useSchedule';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

const BRL_FORMATTER = (v: number) => formatCurrency(v);

export default function Dashboard() {
  const { data: grupos, isLoading: loadingGrupos } = useOrcamentoGrupos();
  const { data: auditStats } = useAuditStats();
  const { data: medicoes } = useMedicoes();

  // Calculate totals from real groups
  const totalOrcado = grupos?.reduce((s, g) => s + Number(g.valor_total), 0) ?? 0;
  // We use seed consumed values for demo (since materialized view needs company access)
  const totalConsumido = 1_075_564.80; // Sum from seed data
  const totalSaldo = totalOrcado - totalConsumido;
  const pctExecucao = totalOrcado > 0 ? totalConsumido / totalOrcado : 0;

  const SUMMARY_CARDS = [
    { label: 'Total Orçado', value: totalOrcado, icon: DollarSign, accent: 'text-orcado', isPercent: false },
    { label: 'Consumido (Real)', value: totalConsumido, icon: TrendingUp, accent: 'text-consumido', isPercent: false },
    { label: 'Saldo Futuro', value: totalSaldo, icon: BarChart3, accent: 'text-saldo', isPercent: false },
    { label: '% Execução', value: pctExecucao, icon: AlertTriangle, accent: 'text-module-dashboard', isPercent: true },
  ];

  // Top 15 groups for chart
  const chartData = (grupos ?? [])
    .filter(g => g.nome !== 'RECEITAS')
    .slice(0, 15)
    .map(g => ({
      nome: g.nome.length > 20 ? g.nome.substring(0, 18) + '…' : g.nome,
      orcado: Number(g.valor_total),
      consumido: 0, // Would come from materialized view
    }));

  // S-Curve data from medicoes
  const curvaData = (medicoes ?? []).map((m, i) => ({
    quinzena: `Q${m.numero}`,
    orcadoAcum: (medicoes ?? []).slice(0, i + 1).reduce((s, x) => s + x.valor_planejado, 0),
    realizadoAcum: 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">
          Status do Projeto: 64 Casas — Quinzena 01
        </h1>
        <p className="text-sm text-muted-foreground mt-1">São Francisco de Paula/RS — Início: 09/03/2026</p>
      </div>

      <GoldenRuleBar orcado={totalOrcado} consumido={totalConsumido} saldo={totalSaldo} />

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
              {card.isPercent ? formatPercent(card.value) : formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Budget vs Actual */}
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Orçado × Realizado — Top 15 Grupos
          </p>
          {loadingGrupos ? (
            <SkeletonTable rows={5} cols={3} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={BRL_FORMATTER} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={BRL_FORMATTER} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="orcado" name="Orçado" fill="hsl(var(--orcado))" radius={[0, 2, 2, 0]} />
                <Bar dataKey="consumido" name="Consumido" fill="hsl(var(--consumido))" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* S-Curve */}
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Curva S — Acumulado por Quinzena
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={curvaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="quinzena" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={BRL_FORMATTER} tick={{ fontSize: 10 }} />
              <Tooltip formatter={BRL_FORMATTER} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="orcadoAcum" name="Orçado Acum." stroke="hsl(var(--orcado))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="realizadoAcum" name="Realizado Acum." stroke="hsl(var(--consumido))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top Deviations */}
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Top 5 Desvios
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-1.5 px-2">Grupo</th>
                <th className="text-right py-1.5 px-2">% Exec.</th>
              </tr>
            </thead>
            <tbody>
              {(grupos ?? []).slice(0, 5).map(g => (
                <tr key={g.id} className="border-t">
                  <td className="py-1.5 px-2 text-xs">{g.nome.substring(0, 25)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cash Flow */}
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            Fluxo de Caixa Projetado
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={curvaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="quinzena" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={BRL_FORMATTER} tick={{ fontSize: 9 }} />
              <Tooltip formatter={BRL_FORMATTER} />
              <Area type="monotone" dataKey="orcadoAcum" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mini Cards */}
        <div className="bg-card border rounded-xl p-5 shadow-card space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Fila de Auditoria
            </p>
            <p className="font-mono text-lg font-bold">{auditStats?.pendentes ?? 0} pendentes</p>
            <p className="text-xs text-muted-foreground">
              Score médio: <span className="font-mono">{((auditStats?.avgScore ?? 0) * 100).toFixed(0)}%</span>
            </p>
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
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Medições
            </p>
            <div className="flex gap-1">
              {(medicoes ?? []).map(m => (
                <div
                  key={m.numero}
                  className={`w-6 h-6 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                    m.status === 'em_andamento' ? 'bg-module-dashboard/20 text-module-dashboard' :
                    m.status === 'liberada' ? 'bg-consumido/20 text-consumido' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {m.numero}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
