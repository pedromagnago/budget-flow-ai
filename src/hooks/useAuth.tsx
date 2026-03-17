import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  companyId: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    companyId: null,
    loading: true,
  });

  const fetchRole = useCallback(async (userId: string) => {
    try {
      // Query user_roles table directly via RPC or raw query
      // Table may not exist yet during initial setup
      const { data, error } = await supabase
        .rpc('get_user_role', { _user_id: userId }) as { data: { role: string; company_id: string } | null; error: unknown };
      
      if (error || !data) {
        // Fallback: default to supervisor for demo
        return { role: 'supervisor' as UserRole, companyId: null };
      }

      return {
        role: (data.role as UserRole) ?? null,
        companyId: (data.company_id as string) ?? null,
      };
    } catch {
      // Table doesn't exist yet — default role for development
      return { role: 'supervisor' as UserRole, companyId: null };
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Defer role fetch to avoid Supabase deadlock
          setTimeout(async () => {
            const { role, companyId } = await fetchRole(session.user.id);
            setState({ user: session.user, session, role, companyId, loading: false });
          }, 0);
        } else {
          setState({ user: null, session: null, role: null, companyId: null, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { role, companyId } = await fetchRole(session.user.id);
        setState({ user: session.user, session, role, companyId, loading: false });
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
