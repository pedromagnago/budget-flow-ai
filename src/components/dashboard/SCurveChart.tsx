import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface CurvaPoint {
  quinzena: string;
  orcadoAcum: number;
  realizadoAcum: number;
  receitaAcum?: number;
}

interface Props {
  data: CurvaPoint[];
}

const BRL = (v: number) => formatCurrency(v);

export function SCurveChart({ data }: Props) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
        Curva S — Acumulado por Quinzena
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="quinzena" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={BRL} tick={{ fontSize: 10 }} />
          <Tooltip formatter={BRL} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="orcadoAcum" name="Orçado Acum." stroke="hsl(var(--orcado))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="realizadoAcum" name="Realizado Acum." stroke="hsl(var(--consumido))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
