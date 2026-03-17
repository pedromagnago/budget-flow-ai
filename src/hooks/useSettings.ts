import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useAuth } from './useAuth';
import { STALE_TIMES } from '@/lib/constants';
import { toast } from 'sonner';

// ── Company config ──
export function useCompanySettings() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['company-settings', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.configs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('companies')
        .update(updates as never)
        .eq('id', companyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar'),
  });
}

// ── Categorias de-para ──
export function useCategorias() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['categorias', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.configs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_depara')
        .select('*')
        .eq('company_id', companyId!)
        .order('departamento_omie');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase
        .from('categoria_depara')
        .update(updates as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria atualizada');
    },
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (input: { apropriacao_excel: string; departamento_omie: string; categoria_omie?: string }) => {
      const { error } = await supabase
        .from('categoria_depara')
        .insert({ ...input, company_id: companyId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria criada');
    },
  });
}

// ── User roles ──
export function useUserRoles() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['user-roles', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.configs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('company_id', companyId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { ...input, company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success(`Usuário ${data.email} criado com sucesso`);
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao criar usuário'),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; role?: string; active?: boolean }) => {
      const { error } = await supabase
        .from('user_roles')
        .update(updates as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Usuário atualizado');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });
}

// ── Alertas ──
export function useAlertas() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['alertas', companyId],
    enabled: !!companyId,
    staleTime: STALE_TIMES.dashboard,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkAlertaRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alertas')
        .update({ lido: true, lido_por: user?.id ?? null, lido_em: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alertas'] }),
  });
}
