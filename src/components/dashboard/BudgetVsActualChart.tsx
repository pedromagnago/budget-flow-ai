import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { SkeletonTable } from '@/components/shared/SkeletonTable';

interface ChartGroup {
  nome: string;
  orcado: number;
  consumido: number;
}

interface Props {
  data: ChartGroup[];
  loading?: boolean;
}

const BRL = (v: number) => formatCurrency(v);

export function BudgetVsActualChart({ data, loading }: Props) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
        Orçado × Realizado — Top 15 Grupos
      </p>
      {loading ? (
        <SkeletonTable rows={5} cols={3} />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={BRL} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10 }} />
            <Tooltip formatter={BRL} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="orcado" name="Orçado" fill="hsl(var(--orcado))" radius={[0, 2, 2, 0]} />
            <Bar dataKey="consumido" name="Consumido" fill="hsl(var(--consumido))" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
