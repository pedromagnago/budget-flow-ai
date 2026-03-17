import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface FluxoPoint {
  quinzena: string;
  realizado: number;
  projetado: number;
}

interface Props {
  data: FluxoPoint[];
}

const BRL = (v: number) => formatCurrency(v);

export function CashFlowChart({ data }: Props) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
        Fluxo de Caixa Projetado
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="quinzena" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={BRL} tick={{ fontSize: 9 }} />
          <Tooltip formatter={BRL} />
          <Area type="monotone" dataKey="realizado" name="Realizado" stackId="1" fill="hsl(var(--consumido) / 0.3)" stroke="hsl(var(--consumido))" strokeWidth={1.5} />
          <Area type="monotone" dataKey="projetado" name="Projetado" stackId="1" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
