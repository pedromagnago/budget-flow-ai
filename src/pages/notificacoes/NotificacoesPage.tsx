import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, Clock, CalendarClock, CalendarCheck, TrendingUp, Banknote, Link2, Bell,
  CheckCheck, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const TIPO_ICON: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  pagamento_atrasado: { icon: AlertTriangle, className: 'text-destructive', label: 'Atrasado' },
  vencimento_hoje: { icon: Clock, className: 'text-yellow-600', label: 'Vence hoje' },
  vencimento_amanha: { icon: CalendarClock, className: 'text-primary', label: 'Vence amanhã' },
  vencimento_semana: { icon: CalendarCheck, className: 'text-primary', label: 'Semana' },
  recebimento_previsto: { icon: Banknote, className: 'text-emerald-600', label: 'Recebimento' },
  desvio_orcamento: { icon: TrendingUp, className: 'text-destructive', label: 'Desvio' },
  conciliacao_pendente: { icon: Link2, className: 'text-orange-500', label: 'Conciliação' },
  sistema: { icon: Bell, className: 'text-muted-foreground', label: 'Sistema' },
};

const ALL_TIPOS = Object.keys(TIPO_ICON);

function groupByDate(items: Notificacao[]) {
  const groups: { label: string; items: Notificacao[] }[] = [];
  const today: Notificacao[] = [];
  const yesterday: Notificacao[] = [];
  const week: Notificacao[] = [];
  const older: Notificacao[] = [];

  items.forEach(n => {
    const d = new Date(n.created_at);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else if (isThisWeek(d)) week.push(n);
    else older.push(n);
  });

  if (today.length) groups.push({ label: 'Hoje', items: today });
  if (yesterday.length) groups.push({ label: 'Ontem', items: yesterday });
  if (week.length) groups.push({ label: 'Esta semana', items: week });
  if (older.length) groups.push({ label: 'Mais antigas', items: older });
  return groups;
}

export default function NotificacoesPage() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const navigate = useNavigate();
  const [filterTipo, setFilterTipo] = useState<string | null>(null);
  const [filterLida, setFilterLida] = useState<'all' | 'lida' | 'nao_lida'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = notificacoes;
    if (filterTipo) list = list.filter(n => n.tipo === filterTipo);
    if (filterLida === 'lida') list = list.filter(n => n.lida);
    if (filterLida === 'nao_lida') list = list.filter(n => !n.lida);
    return list;
  }, [notificacoes, filterTipo, filterLida]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markSelected = () => {
    selected.forEach(id => marcarLida.mutate(id));
    setSelected(new Set());
  };

  const getNavTarget = (tipo: string) => {
    if (['pagamento_atrasado', 'vencimento_hoje', 'vencimento_amanha', 'vencimento_semana', 'recebimento_previsto'].includes(tipo)) return '/financeiro';
    if (tipo === 'desvio_orcamento') return '/dashboard';
    if (tipo === 'conciliacao_pendente') return '/banking';
    return '/dashboard';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">{naoLidas} não lida{naoLidas !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="outline" onClick={markSelected}>
              <CheckCheck className="h-4 w-4 mr-1" /> Marcar {selected.size} como lidas
            </Button>
          )}
          {naoLidas > 0 && (
            <Button size="sm" variant="outline" onClick={() => marcarTodasLidas.mutate()}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={filterTipo === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilterTipo(null)}
        >
          Todos
        </Badge>
        {ALL_TIPOS.filter(t => t !== 'sistema').map(t => {
          const cfg = TIPO_ICON[t];
          return (
            <Badge
              key={t}
              variant={filterTipo === t ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterTipo(filterTipo === t ? null : t)}
            >
              {cfg.label}
            </Badge>
          );
        })}
        <div className="ml-auto flex gap-1">
          {(['all', 'nao_lida', 'lida'] as const).map(v => (
            <Button key={v} size="sm" variant={filterLida === v ? 'default' : 'ghost'} className="text-xs h-7" onClick={() => setFilterLida(v)}>
              {v === 'all' ? 'Todas' : v === 'nao_lida' ? 'Não lidas' : 'Lidas'}
            </Button>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Nenhuma notificação encontrada</div>
      ) : (
        groups.map(g => (
          <div key={g.label} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{g.label}</p>
            <div className="rounded-lg border bg-card divide-y">
              {g.items.map(n => {
                const cfg = TIPO_ICON[n.tipo] ?? TIPO_ICON.sistema;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      !n.lida && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selected.has(n.id)}
                      onCheckedChange={() => toggleSelect(n.id)}
                      className="mt-1"
                    />
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.className)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.lida && 'font-semibold')}>{n.titulo}</p>
                      <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Ir para" onClick={() => {
                        if (!n.lida) marcarLida.mutate(n.id);
                        navigate(getNavTarget(n.tipo));
                      }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
