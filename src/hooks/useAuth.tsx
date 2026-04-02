import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';
import { useQueryClient } from '@tanstack/react-query';

interface CompanyInfo {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  companyId: string | null;
  companies: CompanyInfo[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchCompany: (companyId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'fleury_last_company';

interface CompanyRow { role: string; company_id: string; company_name: string }
interface RoleRow { role: string; company_id: string }

async function fetchCompanies(userId: string): Promise<CompanyInfo[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_companies' as never, { _user_id: userId } as never) as unknown as { data: CompanyRow[] | null; error: Error | null };

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map(r => ({ id: r.company_id, name: r.company_name ?? '', role: r.role as UserRole }));
    }
  } catch { /* ignore */ }

  // Fallback to old RPC for compatibility
  try {
    const { data, error } = await supabase.rpc('get_user_role' as never, { _user_id: userId } as never) as unknown as { data: RoleRow[] | null; error: Error | null };
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map(r => ({ id: r.company_id, name: '', role: r.role as UserRole }));
    }
  } catch { /* ignore */ }

  return [];
}

function resolveActiveCompany(companies: CompanyInfo[]): { companyId: string | null; role: UserRole | null } {
  if (companies.length === 0) return { companyId: null, role: null };

  const saved = localStorage.getItem(STORAGE_KEY);
  const match = saved ? companies.find(c => c.id === saved) : null;
  const active = match ?? companies[0];

  return { companyId: active.id, role: active.role };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    companyId: null,
    companies: [],
    loading: true,
  });

  const handleSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const companies = await fetchCompanies(session.user.id);
      const { companyId, role } = resolveActiveCompany(companies);
      if (companyId) localStorage.setItem(STORAGE_KEY, companyId);
      setState({ user: session.user, session, role, companyId, companies, loading: false });
    } else {
      setState({ user: null, session: null, role: null, companyId: null, companies: [], loading: false });
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => handleSession(session), 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const switchCompany = useCallback((targetId: string) => {
    setState(prev => {
      const match = prev.companies.find(c => c.id === targetId);
      if (!match) return prev;
      localStorage.setItem(STORAGE_KEY, targetId);
      return { ...prev, companyId: targetId, role: match.role };
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, switchCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
