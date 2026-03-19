import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ROLE_REDIRECT } from "@/lib/constants";

import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import AuditQueue from "@/pages/audit/AuditQueue";
import ClientPortal from "@/pages/client/ClientPortal";
import PlanejamentoPage from "@/pages/planejamento/PlanejamentoPage";
import BankingPage from "@/pages/banking/BankingPage";
import Simulator from "@/pages/simulator/Simulator";
import SettingsPage from "@/pages/settings/SettingsPage";
import ImportPage from "@/pages/import/ImportPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  const target = (role && ROLE_REDIRECT[role]) || '/dashboard';
  return <Navigate to={target} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/audit" element={<AuditQueue />} />
              <Route path="/client" element={<ClientPortal />} />
              <Route path="/planejamento" element={<PlanejamentoPage />} />
              <Route path="/schedule" element={<Navigate to="/planejamento" replace />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/import" element={<ImportPage />} />
            </Route>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
