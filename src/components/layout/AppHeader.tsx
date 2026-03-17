import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/client': 'Portal do Cliente',
  '/audit': 'Fila de Auditoria',
  '/schedule': 'Cronograma Físico',
  '/simulator': 'Simulador de Cenários',
  '/settings': 'Configurações',
};

export function AppHeader() {
  const { pathname } = useLocation();
  const currentPage = Object.entries(BREADCRUMB_MAP).find(([path]) => pathname.startsWith(path));

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">SFP</span>
          {currentPage && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{currentPage[1]}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-2">
          Quinzena Q1
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] font-mono bg-destructive text-destructive-foreground">
            3
          </Badge>
        </Button>
      </div>
    </header>
  );
}
