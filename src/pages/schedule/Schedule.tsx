import { cn } from '@/lib/utils';

const SERVICES = [
  'Instalações/Canteiros', 'Fundação Radier', 'Hidrosanitário Radier', 'Administração obra',
  'Paredes pré-moldadas', 'Estrutura telhado', 'Impermeabilização', 'Revestimentos',
  'Portas internas', 'Elétrica', 'Pintura interna', 'Limpeza final',
];

const MEDICOES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];

// Demo: meta/real pairs
const DEMO_DATA: Record<string, Record<string, { meta: number; real: number }>> = {
  'Instalações/Canteiros': { M1: { meta: 100, real: 100 } },
  'Fundação Radier': { M1: { meta: 50, real: 35 }, M2: { meta: 50, real: 0 } },
  'Hidrosanitário Radier': { M1: { meta: 50, real: 30 }, M2: { meta: 50, real: 0 } },
  'Administração obra': { M1: { meta: 12.5, real: 12.5 }, M2: { meta: 12.5, real: 0 }, M3: { meta: 12.5, real: 0 }, M4: { meta: 12.5, real: 0 }, M5: { meta: 12.5, real: 0 }, M6: { meta: 12.5, real: 0 }, M7: { meta: 12.5, real: 0 }, M8: { meta: 12.5, real: 0 } },
  'Paredes pré-moldadas': { M3: { meta: 31.25, real: 0 }, M4: { meta: 31.25, real: 0 }, M5: { meta: 37.5, real: 0 } },
  'Estrutura telhado': { M3: { meta: 31.25, real: 0 }, M4: { meta: 31.25, real: 0 }, M5: { meta: 37.5, real: 0 } },
};

function getCellColor(meta: number, real: number) {
  if (real >= meta) return 'bg-consumido/10 text-consumido';
  if (real > 0) return 'bg-module-dashboard/10 text-module-dashboard';
  if (meta > 0) return 'bg-destructive/10 text-destructive';
  return 'bg-muted/30 text-muted-foreground';
}

export default function Schedule() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Cronograma Físico</h1>
      <p className="text-sm text-muted-foreground">Avanço por serviço × medição — clique na célula para registrar progresso</p>

      <div className="bg-card border rounded-xl shadow-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-3 sticky left-0 bg-muted/50 min-w-[200px]">Serviço</th>
              {MEDICOES.map(m => (
                <th key={m} className="text-center py-2 px-3 min-w-[90px]">{m}</th>
              ))}
              <th className="text-center py-2 px-3 min-w-[80px]">% Geral</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map(service => {
              const data = DEMO_DATA[service] ?? {};
              const totalMeta = MEDICOES.reduce((s, m) => s + (data[m]?.meta ?? 0), 0);
              const totalReal = MEDICOES.reduce((s, m) => s + (data[m]?.real ?? 0), 0);
              const pctGeral = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;

              return (
                <tr key={service} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3 font-medium sticky left-0 bg-card">{service}</td>
                  {MEDICOES.map(m => {
                    const cell = data[m];
                    if (!cell) return <td key={m} className="py-2 px-3 text-center text-muted-foreground/30">—</td>;
                    return (
                      <td key={m} className="py-1 px-2 text-center">
                        <div className={cn('rounded px-2 py-1 text-xs font-mono cursor-pointer', getCellColor(cell.meta, cell.real))}>
                          {cell.meta}% / {cell.real}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center font-mono text-xs font-bold">
                    {pctGeral.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
