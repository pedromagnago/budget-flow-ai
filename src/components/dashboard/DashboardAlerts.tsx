import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import {
  AlertTriangle, Clock, CalendarCheck, Banknote, Link2,
} from 'lucide-react';

interface AlertCard {
  key: string;
  label: string;
  icon: React.ElementType;
  count: number;
  total: number;
  colorClass: string;
  bgClass: string;
  href: string;
}

export function DashboardAlerts() {
  const { companyId } = useCompany();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['dashboard-alerts', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: lancs } = await supabase
        .from('vw_lancamentos_status')
        .select('id, tipo, valor, status_calculado, dias_ate_vencimento')
        .eq('company_id', companyId!);

      const items = lancs ?? [];
      const atrasados = items.filter(l => l.status_calculado === 'atrasado' && l.tipo === 'despesa');
      const hoje = items.filter(l => l.dias_ate_vencimento === 0 && l.tipo === 'despesa' && l.status_calculado !== 'pago');
      const semana = items.filter(l => (l.dias_ate_vencimento ?? 99) > 0 && (l.dias_ate_vencimento ?? 99) <= 7 && l.tipo === 'despesa' && l.status_calculado !== 'pago');
      const recebimentos = items.filter(l => l.tipo === 'receita' && l.status_calculado !== 'pago' && (l.dias_ate_vencimento ?? 99) >= 0 && (l.dias_ate_vencimento ?? 99) <= 7);

      const { count: pendConc } = await supabase
        .from('movimentacoes_bancarias')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('conciliado', false);

      return {
        atrasados: { count: atrasados.length, total: atrasados.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0) },
        hoje: { count: hoje.length, total: hoje.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0) },
        semana: { count: semana.length, total: semana.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0) },
        recebimentos: { count: recebimentos.length, total: recebimentos.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0) },
        conciliacao: { count: pendConc ?? 0, total: 0 },
      };
    },
  });

  if (!data) return null;

  const cards: AlertCard[] = [
    { key: 'atrasados', label: 'Atrasados', icon: AlertTriangle, count: data.atrasados.count, total: data.atrasados.total, colorClass: 'text-destructive', bgClass: 'bg-destructive/10', href: '/financeiro' },
    { key: 'hoje', label: 'Vencem hoje', icon: Clock, count: data.hoje.count, total: data.hoje.total, colorClass: 'text-yellow-600', bgClass: 'bg-yellow-100 dark:bg-yellow-900/20', href: '/financeiro' },
    { key: 'semana', label: 'Vencem em 7 dias', icon: CalendarCheck, count: data.semana.count, total: data.semana.total, colorClass: 'text-orange-600', bgClass: 'bg-orange-100 dark:bg-orange-900/20', href: '/financeiro' },
    { key: 'recebimentos', label: 'Recebimentos previstos', icon: Banknote, count: data.recebimentos.count, total: data.recebimentos.total, colorClass: 'text-primary', bgClass: 'bg-primary/10', href: '/financeiro' },
    { key: 'conciliacao', label: 'Pendentes conciliação', icon: Link2, count: data.conciliacao.count, total: 0, colorClass: 'text-purple-600', bgClass: 'bg-purple-100 dark:bg-purple-900/20', href: '/banking' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => {
        const active = c.count > 0;
        return (
          <button
            key={c.key}
            onClick={() => navigate(c.href)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              active ? cn(c.bgClass, 'hover:opacity-80') : 'bg-muted/50 opacity-60'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={cn('h-4 w-4', active ? c.colorClass : 'text-muted-foreground')} />
              <span className={cn('text-lg font-bold tabular-nums', active ? c.colorClass : 'text-muted-foreground')}>
                {c.count}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">{c.label}</p>
            {c.total > 0 && (
              <p className={cn('text-xs font-mono mt-0.5', active ? c.colorClass : 'text-muted-foreground')}>
                {formatCurrency(c.total)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
