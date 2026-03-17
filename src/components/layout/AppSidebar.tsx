import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3,
  Upload,
  CheckSquare,
  Calendar,
  SlidersHorizontal,
  Settings,
  Bell,
  ChevronLeft,
  Building2,
  LogOut,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/constants';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
  badge?: number;
  accent?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: BarChart3, accent: 'module-dashboard' },
  { title: 'Portal Cliente', href: '/client', icon: Upload, roles: ['cliente'], accent: 'module-client' },
  { title: 'Auditoria', href: '/audit', icon: CheckSquare, roles: ['operador', 'supervisor', 'super_admin'], badge: 12, accent: 'module-audit' },
  { title: 'Cronograma', href: '/schedule', icon: Calendar, accent: 'module-schedule' },
  { title: 'Simulador', href: '/simulator', icon: SlidersHorizontal, roles: ['operador', 'supervisor', 'super_admin'], accent: 'module-simulator' },
  { title: 'Configurações', href: '/settings', icon: Settings, roles: ['supervisor', 'super_admin'], accent: 'module-settings' },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { role, user, signOut } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return role && item.roles.includes(role);
  });

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-3 p-4 h-14', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">SFP 64 Casas</p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Q1 — Ativo</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', isActive && item.accent)} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge != null && item.badge > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-mono bg-sidebar-primary text-sidebar-primary-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Alerts */}
      <div className="px-2 py-2">
        <Link
          to="/alerts"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          <Bell className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1">Alertas</span>
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-mono bg-destructive text-destructive-foreground">
                3
              </Badge>
            </>
          )}
        </Link>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className={cn('p-3 flex items-center gap-3', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold">
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email ?? 'Usuário'}</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{role ?? '—'}</p>
          </div>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-card flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
