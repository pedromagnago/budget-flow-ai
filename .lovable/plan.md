

# Plano de Desenvolvimento: Correções, Conexões e Melhorias UX

## Diagnóstico

Após análise completa do código, identifiquei problemas em 4 categorias: **dados hardcoded**, **fluxos desconectados**, **UX fraca** e **funcionalidades pendentes críticas**.

---

## Fase 1 — Correções Urgentes

### 1.1 Quinzena dinâmica no Dashboard e Sidebar
O Dashboard mostra "Quinzena 01" hardcoded e a Sidebar mostra "Q1 — Ativo" fixo. O campo `companies.config.quinzena_atual` já existe e é editável em Settings, mas não é lido pelo Dashboard nem pela Sidebar.

**Ação**: Ler `quinzena_atual` do config da empresa e usá-lo no título do Dashboard e no subtítulo da Sidebar.

### 1.2 Badge de auditoria hardcoded na Sidebar
A Sidebar mostra `badge: 12` fixo no item Auditoria e `3` fixo em Alertas. Devem refletir dados reais.

**Ação**: Criar um hook leve que consulta contagem de `classificacoes_ia` pendentes e `alertas` não lidos, alimentando os badges dinamicamente.

### 1.3 Fallback de role no Auth
Quando `get_user_role` retorna vazio (usuário sem role), o sistema assume `supervisor` — isso é um risco de segurança. Um usuário novo sem role atribuída ganha acesso total.

**Ação**: Mudar o fallback para `null` e redirecionar para uma tela de "Aguardando aprovação" quando o usuário não tem role.

---

## Fase 2 — Conexões entre Módulos

### 2.1 Onboarding guiado (Empty States inteligentes)
Quando o usuário acessa o Dashboard sem dados importados, vê gráficos vazios sem orientação. Mesmo no Cronograma e Simulador.

**Ação**: Criar componentes de empty state com CTAs contextuais:
- Dashboard vazio → "Importe seu orçamento" (link para `/import`)
- Cronograma vazio → "Importe serviços e medições" (link para `/import` aba correta)
- Simulador vazio → "Importe dados primeiro"
- Auditoria vazia → "Nenhum documento para revisar"

### 2.2 Navegação contextual pós-importação
Após importar orçamento com sucesso, o usuário não sabe para onde ir.

**Ação**: Após importação bem-sucedida, exibir toast com ação "Ver no Dashboard" que navega para `/dashboard`.

### 2.3 Refresh automático da materialized view
A view `v_orcado_vs_realizado` é materializada e precisa ser refreshed após importação. Atualmente não há chamada ao `refresh_materialized_views()` após import.

**Ação**: Após importação de orçamento, chamar `supabase.rpc('refresh_materialized_views')`.

---

## Fase 3 — Melhorias de UX

### 3.1 Responsividade do Dashboard
Os grids usam `grid-cols-2` e `grid-cols-3` fixos, quebrando em telas menores. O viewport atual do usuário é 1067px.

**Ação**: Usar breakpoints responsivos (`grid-cols-1 md:grid-cols-2`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).

### 3.2 Stepper visual na Importação
O fluxo de importação (upload → análise → importar) não tem indicação visual de progresso/etapas.

**Ação**: Adicionar um stepper com 3 passos no topo da seção de orçamento: 1. Upload → 2. Revisão → 3. Importar.

### 3.3 Confirmação antes de limpar dados
O checkbox "Limpar orçamento existente" é perigoso e não pede confirmação.

**Ação**: Ao clicar Importar com "limpar" ativo, exibir AlertDialog de confirmação.

### 3.4 Feedback de estado vazio no Portal do Cliente
Se não há documentos nem orçamento, o cliente vê componentes vazios sem orientação.

**Ação**: Empty states com mensagens amigáveis para o perfil cliente.

---

## Fase 4 — Funcionalidade Pendente Prioritária

### 4.1 Suporte a Excel (.xlsx)
A importação aceita apenas CSV. A planilha original do usuário é Excel.

**Ação**: Instalar `xlsx` (SheetJS), parsear .xlsx no browser convertendo para o mesmo formato `{headers, rows}` que o CSV parser retorna. Atualizar o `accept` do input para `.csv,.txt,.xlsx,.xls`.

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useDashboard.ts` | Ler `quinzena_atual` do config |
| `src/pages/dashboard/Dashboard.tsx` | Quinzena dinâmica + grids responsivos + empty state |
| `src/components/layout/AppSidebar.tsx` | Badges dinâmicos + quinzena dinâmica |
| `src/hooks/useAuth.tsx` | Fallback role → null |
| `src/pages/auth/Login.tsx` | Tela "aguardando aprovação" |
| `src/hooks/useSmartImport.ts` | Chamar refresh_materialized_views + suporte xlsx |
| `src/pages/import/ImportPage.tsx` | Stepper visual + confirmação limpar + toast pós-import + aceitar xlsx |
| `src/components/shared/EmptyState.tsx` | Criar componente reutilizável de empty state |
| `src/pages/schedule/Schedule.tsx` | Empty state |
| `src/pages/simulator/Simulator.tsx` | Empty state |
| `src/pages/client/ClientPortal.tsx` | Empty state |
| `package.json` | Adicionar `xlsx` |

## Ordem de Implementação

1. Correções de segurança (auth fallback)
2. Suporte a Excel + refresh materialized view
3. Quinzena dinâmica + badges dinâmicos
4. Empty states + onboarding
5. Responsividade + stepper + confirmação

