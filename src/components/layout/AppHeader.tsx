import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/client': 'Documentos',
  '/audit': 'Auditoria',
  '/planejamento': 'Obra',
  '/banking': 'Bancário',
  '/simulator': 'Simulador',
  '/settings': 'Configurações',
  '/import': 'Importação',
};

interface AppHeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function AppHeader({ onMenuClick, isMobile }: AppHeaderProps) {
  const { pathname } = useLocation();
  const currentPage = Object.entries(BREADCRUMB_MAP).find(([path]) => pathname.startsWith(path));

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
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
