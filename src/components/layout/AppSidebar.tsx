import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  HardHat,
  Landmark,
  DollarSign,
  SlidersHorizontal,
  Settings,
  ChevronLeft,
  Building2,
  LogOut,
  FileText,
  FileBarChart,
  ClipboardCheck,
  X,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { UserRole } from '@/lib/constants';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badgeKey?: 'pendingAudit';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [
      { title: 'Painel Geral', href: '/dashboard', icon: BarChart3, roles: ['operador', 'supervisor', 'super_admin'] },
    ],
  },
  {
    label: 'OBRA',
    items: [
      { title: 'Planejamento', href: '/planejamento', icon: HardHat, roles: ['supervisor', 'super_admin'] },
      { title: 'Acompanhamento', href: '/acompanhamento', icon: ClipboardCheck, roles: ['operador', 'supervisor', 'super_admin'] },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { title: 'Financeiro', href: '/financeiro', icon: DollarSign, roles: ['operador', 'supervisor', 'super_admin'] },
      { title: 'Bancário', href: '/banking', icon: Landmark, roles: ['operador', 'supervisor', 'super_admin'] },
      { title: 'Simulador', href: '/simulator', icon: SlidersHorizontal, roles: ['supervisor', 'super_admin'] },
    ],
  },
  {
    label: 'DOCUMENTOS',
    items: [
      { title: 'Documentos', href: '/client', icon: FileText, roles: ['cliente', 'operador', 'supervisor', 'super_admin'], badgeKey: 'pendingAudit' },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { title: 'Relatórios', href: '/relatorios', icon: FileBarChart, roles: ['operador', 'supervisor', 'super_admin'] },
      { title: 'Configurações', href: '/settings', icon: Settings, roles: ['supervisor', 'super_admin'] },
    ],
  },
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
  const { role, user, signOut, companies, companyId, switchCompany } = useAuth();
  const { data: company } = useCompanyConfig();
  const badges = useSidebarBadges();
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const quinzena = company?.config?.quinzena_atual ?? 'Q1';
  const companyName = company?.nome_fantasia || company?.razao_social || 'Projeto';

  const handleSwitchCompany = (targetId: string) => {
    if (targetId === companyId) {
      setPopoverOpen(false);
      return;
    }
    switchCompany(targetId);
    queryClient.invalidateQueries();
    setPopoverOpen(false);
  };

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (role === 'super_admin') return true;
      return role ? item.roles.includes(role) : false;
    }),
  })).filter(group => group.items.length > 0);

  const getBadge = (item: NavItem): number => {
    if (item.badgeKey === 'pendingAudit') return badges.pendingAudit;
    return 0;
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  function renderNavItems(items: NavItem[], showLabels: boolean) {
    return items.map(item => {
      const isActive = pathname.startsWith(item.href);
      const badgeCount = getBadge(item);
      return (
        <Link
          key={item.href}
          to={item.href}
          onClick={handleLinkClick}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            !showLabels && 'justify-center px-0'
          )}
          title={!showLabels ? item.title : undefined}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {showLabels && (
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
    });
  }

  function renderGroups(showLabels: boolean) {
    return visibleGroups.map((group, idx) => (
      <div key={group.label || idx}>
        {group.label && showLabels && (
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            {group.label}
          </p>
        )}
        {group.label && !showLabels && idx > 0 && (
          <Separator className="my-2 bg-sidebar-border" />
        )}
        <div className="space-y-0.5">
          {renderNavItems(group.items, showLabels)}
        </div>
      </div>
    ));
  }

  // Project switcher header
  function renderProjectHeader(showLabels: boolean) {
    const hasMultiple = companies.length > 1;

    const header = (
      <div className={cn('flex items-center gap-3 p-4 h-14', !showLabels && 'justify-center', hasMultiple && showLabels && 'cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors')}>  
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {showLabels && (
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold truncate">{companyName}</p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">{quinzena}</p>
          </div>
        )}
        {showLabels && hasMultiple && (
          <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
        )}
      </div>
    );

    if (!hasMultiple || !showLabels) return header;

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>{header}</PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-56 p-1" sideOffset={8}>
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trocar Projeto</p>
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => handleSwitchCompany(c.id)}
              className={cn(
                'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                c.id === companyId ? 'bg-accent font-medium' : 'hover:bg-accent/50'
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{c.name || 'Projeto sem nome'}</span>
              {c.id === companyId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
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
          <div className="flex items-center justify-between">
            <div className="flex-1">{renderProjectHeader(true)}</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/50 mr-2" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="bg-sidebar-border" />

          <nav className="flex-1 py-2 px-2 overflow-y-auto">
            {renderGroups(true)}
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
      {renderProjectHeader(!collapsed)}

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {renderGroups(!collapsed)}
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
