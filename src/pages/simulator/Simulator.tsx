import { SlidersHorizontal, Plus, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';

const DEMO_PREVISOES = [
  { id: '1', descricao: 'Concreteira RS — Concreto Radier', departamento: '3.2 RADIER', valor: 156000, vencimento: '2026-04-15', editado: false },
  { id: '2', descricao: 'Madeireira Sul — Formas', departamento: '3.2 RADIER', valor: 42000, vencimento: '2026-04-01', editado: true },
  { id: '3', descricao: 'PREVIBRAS — Tela Q-138', departamento: '3.2 RADIER', valor: 89500, vencimento: '2026-04-20', editado: false },
  { id: '4', descricao: 'Fábrica Paredes — Lote 1', departamento: '3.3 PAREDES', valor: 320000, vencimento: '2026-05-01', editado: true },
];

export default function Simulator() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tighter">Simulador de Cenários</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <GitCompare className="h-4 w-4 mr-2" />
            Comparar Cenários
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cenário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Left: editable list */}
        <div className="col-span-3 space-y-4">
          <div className="bg-card border rounded-xl shadow-card overflow-hidden">
            <div className="py-2 px-3 bg-muted/50 flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-module-simulator" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Cenário: Base
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left py-2 px-3">Descrição</th>
                  <th className="text-left py-2 px-3">Dept.</th>
                  <th className="text-right py-2 px-3">Valor</th>
                  <th className="text-left py-2 px-3">Vencimento</th>
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_PREVISOES.map(p => (
                  <tr key={p.id} className={`border-t hover:bg-muted/30 transition-colors cursor-pointer ${p.editado ? 'border-l-2 border-l-module-simulator' : ''}`}>
                    <td className="py-2 px-3 font-medium">{p.descricao}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{p.departamento}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(p.valor)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{formatDate(p.vencimento)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.editado ? 'bg-module-simulator/10 text-module-simulator' : 'bg-muted text-muted-foreground'}`}>
                        {p.editado ? 'Alterado' : 'Original'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: chart placeholder */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-card h-64">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
              Fluxo de Caixa Simulado
            </p>
            <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">
              Gráfico em tempo real (Etapa 7)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Saldo Mínimo', value: '-R$ 245k', accent: 'text-destructive' },
              { label: 'Pior Dia', value: '15/05', accent: 'text-module-dashboard' },
              { label: 'Dias Negativo', value: '12', accent: 'text-destructive' },
            ].map(c => (
              <div key={c.label} className="bg-card border rounded-xl p-3 shadow-card text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                <p className={`font-mono text-lg font-bold ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
