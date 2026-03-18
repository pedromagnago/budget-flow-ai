

# Reorganização Essencialista por Role

## Diagnóstico

Hoje o sistema tem 7 itens no sidebar para todos os roles, com sobreposição entre Dashboard e Portal Cliente (ambos mostram GoldenRuleBar + dados orçamentários). Conforme a Matriz de Acesso do doc original:

- **Cliente**: vê Portal + Dashboard resumido (na prática, precisa de UMA tela)
- **Operador**: trabalha na Auditoria, consulta Dashboard
- **Supervisor/Admin**: Dashboard completo + Auditoria + Config

O princípio "menos é mais" pede: cada role vê apenas o que usa, e a home de cada um é sua ferramenta principal.

## Plano

### 1. Simplificar navegação por role

**`src/components/layout/AppSidebar.tsx`**

Reduzir para o essencial por perfil:

| Item | cliente | operador | supervisor | super_admin |
|---|---|---|---|---|
| Documentos (ex-Portal) | ✅ home | ✅ | ✅ | ✅ |
| Auditoria | -- | ✅ home | ✅ | ✅ |
| Dashboard | -- | ✅ | ✅ home | ✅ home |
| Cronograma | -- | -- | ✅ | ✅ |
| Simulador | -- | -- | ✅ | ✅ |
| Configurações | -- | -- | ✅ | ✅ |
| Importação | -- | -- | ✅ | ✅ |

Mudanças:
- Renomear "Portal Cliente" para "Documentos" (neutro, faz sentido para todos os roles)
- Cliente vê apenas: **Documentos** (sua home)
- Operador vê: **Auditoria** (home) + Dashboard + Documentos
- Supervisor/Admin vê tudo
- Remover "Alertas" do sidebar (já tem o sino no header) -- reduz ruído

### 2. Redirect inteligente por role

**`src/lib/constants.ts`** -- já está correto:
- cliente → `/client`
- operador → `/audit`
- supervisor/admin → `/dashboard`

**`src/App.tsx`** -- mudar o redirect raiz `/` para usar role:
Em vez de sempre ir para `/dashboard`, redirecionar para `ROLE_REDIRECT[role]`.

### 3. Unificar a experiência do cliente

**`src/pages/client/ClientPortal.tsx`**

Simplificar: o cliente precisa de apenas 3 coisas nesta página:
1. Upload de documento (ação principal, destaque)
2. Histórico de envios com status
3. Resumo orçamentário compacto

Remover o título "Portal do Cliente" (o usuário sabe onde está). Manter a GoldenRuleBar como contexto rápido. A página já está essencialmente correta -- apenas ajustar o heading.

### 4. Layout responsivo para mobile

**`src/components/layout/AppLayout.tsx`**

- Em mobile (< 768px), sidebar vira drawer/overlay em vez de fixed left
- Quando fechado, conteúdo ocupa 100% da largura
- Botão hamburger no header para abrir

**`src/components/layout/AppSidebar.tsx`**
- Aceitar prop `isMobile` para renderizar como overlay
- Fechar ao clicar em um link (mobile)

**`src/components/layout/AppHeader.tsx`**
- Adicionar botão hamburger (menu) visível apenas em mobile

### 5. Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `AppSidebar.tsx` | Atualizar NAV_ITEMS roles, renomear "Portal Cliente" → "Documentos", remover Alertas do sidebar, suporte mobile overlay |
| `AppLayout.tsx` | Detectar mobile via hook, passar prop, sidebar como drawer em telas pequenas |
| `AppHeader.tsx` | Botão hamburger em mobile, remover badge hardcoded "3" |
| `constants.ts` | Sem mudança (já correto) |
| `App.tsx` | Redirect `/` baseado em role (via componente wrapper) |
| `ClientPortal.tsx` | Heading mais limpo |

Nenhuma página nova. Nenhuma rota nova. Apenas reorganização do que já existe para reduzir fricção.

