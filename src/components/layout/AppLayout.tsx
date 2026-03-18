import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={isMobile ? false : collapsed}
        onToggle={() => setCollapsed(c => !c)}
        isMobile={isMobile}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className={cn(
        'transition-all duration-200',
        isMobile ? 'ml-0' : (collapsed ? 'ml-16' : 'ml-60')
      )}>
        <AppHeader onMenuClick={() => setMobileOpen(true)} isMobile={isMobile} />
        <main className={cn('p-6', isMobile && 'p-4')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
