import { useMemo } from 'react';
import { useServicosSituacao } from '@/hooks/usePlanejamento';
import { useAvancoFisico } from '@/hooks/useSchedule';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  nao_iniciado: { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Clock },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  atrasado: { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export function ControleServicosTab() {
  const { companyId } = useCompany();
  const { data: servicos, isLoading } = useServicosSituacao();
  const { data: avancos } = useAvancoFisico();

  const { data: grupos } = useQuery({
    queryKey: ['orcamento-grupos-ctrl', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from('orcamento_grupos').select('id, nome').eq('company_id', companyId!).eq('ativo', true);
      return data ?? [];
    },
  });

  const grupoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (grupos ?? []).forEach(g => { map[g.id] = g.nome; });
    return map;
  }, [grupos]);

  // Latest avanco per service
  const avancoMap = useMemo(() => {
    const map: Record<string, number> = {};
    (avancos ?? []).forEach(a => {
      const pct = a.percentual_real ?? 0;
      if (!map[a.servico_id] || pct > map[a.servico_id]) {
        map[a.servico_id] = pct;
      }
    });
    return map;
  }, [avancos]);

  const list = servicos ?? [];

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  if (list.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">Nenhum serviço cadastrado no planejamento.</p>
    </div>
  );

  return (
    <div className="bg-card border rounded-xl shadow-card overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="py-2.5 px-4 font-medium text-xs">Serviço</th>
            <th className="py-2.5 px-4 font-medium text-xs">Etapa</th>
            <th className="py-2.5 px-4 font-medium text-xs text-right">Valor</th>
            <th className="py-2.5 px-4 font-medium text-xs text-center">Avanço</th>
            <th className="py-2.5 px-4 font-medium text-xs text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((sv: { id: string; nome: string; codigo?: string | null; grupo_id?: string | null; valor_total: number; status?: string | null }) => {
            const pct = avancoMap[sv.id] ?? 0;
            const status = sv.status ?? 'nao_iniciado';
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.nao_iniciado;
            const Icon = cfg.icon;
            return (
              <tr key={sv.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="py-2 px-4">
                  <div className="font-medium text-xs">{sv.nome}</div>
                  {sv.codigo && <div className="text-[10px] text-muted-foreground">{sv.codigo}</div>}
                </td>
                <td className="py-2 px-4 text-xs">{sv.grupo_id ? grupoMap[sv.grupo_id] ?? '—' : '—'}</td>
                <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(sv.valor_total)}</td>
                <td className="py-2 px-4 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono">{pct.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-2 px-4 text-center">
                  <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
