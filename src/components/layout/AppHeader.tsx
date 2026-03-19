import { useNavigate, Link } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Clock, CalendarClock, CalendarCheck, TrendingUp, Banknote, Link2,
} from 'lucide-react';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/client': 'Documentos',
  '/audit': 'Auditoria',
  '/planejamento': 'Obra',
  '/financeiro': 'Financeiro',
  '/banking': 'Bancário',
  '/simulator': 'Simulador',
  '/settings': 'Configurações',
  '/import': 'Importação',
  '/notificacoes': 'Notificações',
};

const TIPO_ICON: Record<string, { icon: React.ElementType; className: string }> = {
  pagamento_atrasado: { icon: AlertTriangle, className: 'text-destructive' },
  vencimento_hoje: { icon: Clock, className: 'text-yellow-600' },
  vencimento_amanha: { icon: CalendarClock, className: 'text-primary' },
  vencimento_semana: { icon: CalendarCheck, className: 'text-primary' },
  recebimento_previsto: { icon: Banknote, className: 'text-emerald-600' },
  desvio_orcamento: { icon: TrendingUp, className: 'text-destructive' },
  conciliacao_pendente: { icon: Link2, className: 'text-orange-500' },
  sistema: { icon: Bell, className: 'text-muted-foreground' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `há ${days}d`;
}

interface AppHeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function AppHeader({ onMenuClick, isMobile }: AppHeaderProps) {
  const { pathname } = (typeof window !== 'undefined' ? window.location : { pathname: '/' }) as { pathname: string };
  const navigate = useNavigate();
  const currentPage = Object.entries(BREADCRUMB_MAP).find(([path]) => pathname.startsWith(path));
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();

  const getNavTarget = (n: { tipo: string; lancamento_id: string | null }) => {
    if (n.tipo === 'pagamento_atrasado' || n.tipo === 'vencimento_hoje' || n.tipo === 'vencimento_amanha' || n.tipo === 'vencimento_semana') return '/financeiro';
    if (n.tipo === 'recebimento_previsto') return '/financeiro';
    if (n.tipo === 'desvio_orcamento') return '/dashboard';
    if (n.tipo === 'conciliacao_pendente') return '/banking';
    return '/dashboard';
  };

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <nav className="flex items-center gap-1.5 text-sm">
          {!isMobile && <span className="text-muted-foreground">SFP</span>}
          {currentPage && (
            <>
              {!isMobile && <span className="text-muted-foreground">/</span>}
              <span className="font-medium">{currentPage[1]}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {naoLidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notificações</p>
              {naoLidas > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => marcarTodasLidas.mutate()}>
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notificacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
              ) : (
                notificacoes.slice(0, 15).map(n => {
                  const cfg = TIPO_ICON[n.tipo] ?? TIPO_ICON.sistema;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-0',
                        !n.lida && 'bg-primary/5'
                      )}
                      onClick={() => {
                        if (!n.lida) marcarLida.mutate(n.id);
                        navigate(getNavTarget(n));
                      }}
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.className)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs truncate', !n.lida && 'font-semibold')}>{n.titulo}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.lida && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <Link to="/notificacoes" className="text-xs text-primary hover:underline">
                Ver todas
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
