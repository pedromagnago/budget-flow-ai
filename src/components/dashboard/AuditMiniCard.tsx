interface AuditStats {
  pendentes: number;
  aprovadas: number;
  total: number;
  avgScore: number;
}

interface Medicao {
  numero: number;
  status: string;
}

interface Props {
  auditStats: AuditStats | undefined;
  medicoes: Medicao[];
}

export function AuditMiniCard({ auditStats, medicoes }: Props) {
  return (
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
        <div className="flex gap-1 flex-wrap">
          {medicoes.map(m => (
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
  );
}
