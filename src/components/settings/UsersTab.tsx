import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, ShieldCheck, Eye, EyeOff, Users, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { useCompany } from '@/hooks/useCompany';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  active: boolean | null;
  company_id: string;
  created_at: string | null;
}

interface UsersTabProps {
  userRoles: UserRole[];
  loadingRoles: boolean;
  updateUserRole: { mutate: (input: { id: string; role?: string; active?: boolean }) => void };
  inviteUser: { mutate: (input: { email: string; password: string; role: string }, opts?: { onSuccess?: () => void }) => void; isPending: boolean };
}

export function UsersTab({ userRoles, loadingRoles, updateUserRole, inviteUser }: UsersTabProps) {
  const { companyId } = useCompany();
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'operador' });
  const [showPassword, setShowPassword] = useState(false);
  const [assignRole, setAssignRole] = useState('operador');
  const [selectedUnassigned, setSelectedUnassigned] = useState<string | null>(null);

  // Fetch auth users via edge function
  const { data: authUsers, isLoading: loadingAuthUsers } = useQuery({
    queryKey: ['auth-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AuthUser[]>('list-users');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Map user_id -> email
  const emailMap = useMemo(() => {
    const map: Record<string, string> = {};
    (authUsers ?? []).forEach(u => { map[u.id] = u.email ?? u.id; });
    return map;
  }, [authUsers]);

  // Users registered but without role in this company
  const assignedUserIds = useMemo(() => new Set(userRoles.map(r => r.user_id)), [userRoles]);
  const unassignedUsers = useMemo(() =>
    (authUsers ?? []).filter(u => !assignedUserIds.has(u.id)),
    [authUsers, assignedUserIds]
  );

  const handleAssignRole = async () => {
    if (!selectedUnassigned || !companyId) return;
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedUnassigned,
        company_id: companyId,
        role: assignRole,
        active: true,
      });
      if (error) throw error;
      toast.success(`Papel atribuído com sucesso`);
      setSelectedUnassigned(null);
      // Trigger refetch via query invalidation
      window.dispatchEvent(new Event('user-role-assigned'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atribuir papel');
    }
  };

  const SectionCard = ({ children, title, icon: Icon }: { children: React.ReactNode; title: string; icon?: React.ElementType }) => (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionCard title="Usuários Vinculados" icon={Users}>
        {loadingRoles || loadingAuthUsers ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (userRoles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Papel</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Ativo</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {(userRoles ?? []).map(r => (
                <tr key={r.id} className="border-t">
                  <td className="py-1.5 px-3 text-xs">{emailMap[r.user_id] ?? r.user_id.slice(0, 8) + '…'}</td>
                  <td className="py-1.5 px-3">
                    <Select
                      value={r.role}
                      onValueChange={v => updateUserRole.mutate({ id: r.id, role: v })}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <Switch
                      checked={r.active ?? true}
                      onCheckedChange={v => updateUserRole.mutate({ id: r.id, active: v })}
                      className="scale-75"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-xs text-muted-foreground">{r.created_at ? formatDate(r.created_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Assign role to registered but unassigned users ── */}
      {unassignedUsers.length > 0 && (
        <SectionCard title="Usuários Cadastrados sem Papel" icon={UserCheck}>
          <p className="text-xs text-muted-foreground">
            Estes usuários se cadastraram mas ainda não possuem papel atribuído neste projeto.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-[10px] text-muted-foreground">Usuário</Label>
              <Select value={selectedUnassigned ?? ''} onValueChange={setSelectedUnassigned}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Papel</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" disabled={!selectedUnassigned} onClick={handleAssignRole}>
              <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Atribuir Papel
            </Button>
          </div>
        </SectionCard>
      )}

      {/* ── Invite new user form ── */}
      <SectionCard title="Convidar Novo Usuário" icon={UserPlus}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mín. 6 caracteres"
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                className="h-8 text-xs pl-8 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Papel</Label>
            <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!newUser.email || newUser.password.length < 6 || inviteUser.isPending}
          onClick={() => {
            inviteUser.mutate(newUser, {
              onSuccess: () => setNewUser({ email: '', password: '', role: 'operador' }),
            });
          }}
        >
          <UserPlus className="h-3.5 w-3.5 mr-2" />
          {inviteUser.isPending ? 'Criando...' : 'Criar Usuário'}
        </Button>
      </SectionCard>
    </div>
  );
}
