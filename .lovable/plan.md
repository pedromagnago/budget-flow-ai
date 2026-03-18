

# Correção: Super Admin vê todos os módulos

## Problema
O `super_admin` não vê o "Portal Cliente" no sidebar porque está filtrado por `roles: ['cliente']`. Sem acesso a `/client`, não há como fazer upload de documentos nem acionar a classificação IA.

## Correção

**Arquivo:** `src/components/layout/AppSidebar.tsx` (linha 58-61)

Adicionar uma linha: se o role é `super_admin`, mostrar todos os itens independente do filtro.

```typescript
// Antes
const visibleItems = NAV_ITEMS.filter(item => {
  if (!item.roles) return true;
  return role && item.roles.includes(role);
});

// Depois
const visibleItems = NAV_ITEMS.filter(item => {
  if (!item.roles) return true;
  if (role === 'super_admin') return true;
  return role && item.roles.includes(role);
});
```

Essa única mudança desbloqueia o acesso a todos os módulos (Portal Cliente, Auditoria, Simulador, Configurações, Importação) para o super_admin.

