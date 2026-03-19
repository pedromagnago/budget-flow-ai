import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import {
  BarChart3,
  CheckSquare,
  HardHat,
  Landmark,
  SlidersHorizontal,
  Settings,
  ChevronLeft,
  Building2,
  LogOut,
  FileUp,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/constants';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badgeKey?: 'pendingAudit';
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['operador', 'supervisor', 'super_admin'] },
  { title: 'Documentos', href: '/client', icon: FileText, roles: ['cliente', 'operador', 'supervisor', 'super_admin'] },
  { title: 'Auditoria', href: '/audit', icon: CheckSquare, roles: ['operador', 'supervisor', 'super_admin'], badgeKey: 'pendingAudit' },
  { title: 'Obra', href: '/planejamento', icon: HardHat, roles: ['supervisor', 'super_admin'] },
  { title: 'Simulador', href: '/simulator', icon: SlidersHorizontal, roles: ['supervisor', 'super_admin'] },
  { title: 'Configurações', href: '/settings', icon: Settings, roles: ['supervisor', 'super_admin'] },
  { title: 'Importação', href: '/import', icon: FileUp, roles: ['supervisor', 'super_admin'] },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, open, onClose }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { role, user, signOut } = useAuth();
  const { data: company } = useCompanyConfig();
  const badges = useSidebarBadges();

  const quinzena = company?.config?.quinzena_atual ?? 'Q1';
  const companyName = company?.nome_fantasia || company?.razao_social || 'Projeto';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (role === 'super_admin') return true;
    return role ? item.roles.includes(role) : false;
  });

  const getBadge = (item: NavItem): number => {
    if (item.badgeKey === 'pendingAudit') return badges.pendingAudit;
    return 0;
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{companyName}</p>
                <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">{quinzena}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/50" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="bg-sidebar-border" />

          <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
            {visibleItems.map(item => {
              const isActive = pathname.startsWith(item.href);
              const badgeCount = getBadge(item);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {badgeCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-mono bg-sidebar-primary text-sidebar-primary-foreground">
                      {badgeCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          <Separator className="bg-sidebar-border" />

          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold">{user?.email?.charAt(0).toUpperCase() ?? 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email ?? 'Usuário'}</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{role ?? '—'}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center gap-3 p-4 h-14', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{companyName}</p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">{quinzena}</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          const badgeCount = getBadge(item);
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
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {badgeCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-mono bg-sidebar-primary text-sidebar-primary-foreground">
                      {badgeCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className={cn('p-3 flex items-center gap-3', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold">{user?.email?.charAt(0).toUpperCase() ?? 'U'}</span>
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

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-card flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
