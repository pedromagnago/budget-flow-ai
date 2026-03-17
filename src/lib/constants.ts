export type UserRole = 'super_admin' | 'supervisor' | 'operador' | 'cliente';

export type DocumentStatus =
  | 'recebido'
  | 'processando'
  | 'classificado'
  | 'aprovado'
  | 'corrigido'
  | 'rejeitado'
  | 'executado'
  | 'erro';

export type MedicaoStatus = 'no_prazo' | 'em_risco' | 'atrasada' | 'futura';

export const STATUS_LABELS: Record<string, string> = {
  recebido: 'Recebido',
  processando: 'Processando',
  classificado: 'Classificado',
  aprovado: 'Aprovado',
  corrigido: 'Corrigido',
  rejeitado: 'Rejeitado',
  executado: 'Executado',
  erro: 'Erro',
  pendente: 'Pendente',
  no_prazo: 'No Prazo',
  em_risco: 'Em Risco',
  atrasada: 'Atrasada',
  futura: 'Futura',
};

export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  recebido: 'secondary',
  processando: 'default',
  classificado: 'outline',
  aprovado: 'default',
  corrigido: 'default',
  rejeitado: 'destructive',
  executado: 'default',
  erro: 'destructive',
  pendente: 'outline',
  no_prazo: 'default',
  em_risco: 'outline',
  atrasada: 'destructive',
  futura: 'secondary',
};

// Status color classes — background + text
export const STATUS_COLORS: Record<string, string> = {
  recebido: 'bg-muted text-muted-foreground',
  processando: 'bg-primary/10 text-primary',
  classificado: 'bg-module-dashboard/10 text-module-dashboard',
  aprovado: 'bg-consumido/10 text-consumido',
  corrigido: 'bg-module-audit/10 text-module-audit',
  rejeitado: 'bg-destructive/10 text-destructive',
  executado: 'bg-consumido/20 text-consumido',
  erro: 'bg-destructive/20 text-destructive',
  pendente: 'bg-module-dashboard/10 text-module-dashboard',
  no_prazo: 'bg-consumido/10 text-consumido',
  em_risco: 'bg-module-dashboard/10 text-module-dashboard',
  atrasada: 'bg-destructive/10 text-destructive',
  futura: 'bg-muted text-muted-foreground',
};

export const STALE_TIMES = {
  saldos: 30 * 1000,
  contas: 2 * 60 * 1000,
  dashboard: 60 * 1000,
  configs: 30 * 60 * 1000,
} as const;

export const ROLE_REDIRECT: Record<UserRole, string> = {
  super_admin: '/dashboard',
  supervisor: '/dashboard',
  operador: '/audit',
  cliente: '/client',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  supervisor: 'Supervisor',
  operador: 'Operador',
  cliente: 'Cliente',
};
