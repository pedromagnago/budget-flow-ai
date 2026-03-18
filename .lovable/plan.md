

# Plano de Interação por Página e Lacunas para Operadores

## Mapa de Acesso por Papel (Role)

```text
Página            | cliente | operador | supervisor | super_admin
──────────────────┼─────────┼──────────┼────────────┼────────────
Dashboard         |    ✗    |    ✓     |     ✓      |     ✓
Documentos        |    ✓    |    ✓     |     ✓      |     ✓
Auditoria         |    ✗    |    ✓     |     ✓      |     ✓
Cronograma        |    ✗    |    ✗     |     ✓      |     ✓
Simulador         |    ✗    |    ✗     |     ✓      |     ✓
Configurações     |    ✗    |    ✗     |     ✓      |     ✓
Importação        |    ✗    |    ✗     |     ✓      |     ✓
```

O **operador** hoje acessa apenas: Dashboard, Documentos e Auditoria.

---

## Fluxo de Interação por Página

### 1. LOGIN (`/login`)
**Interações**: Email + senha → Supabase Auth → redirect por role (operador → `/audit`)
**Status**: ✅ Funcional
**Falta**: Nada crítico

### 2. DASHBOARD (`/dashboard`) — Leitura
**Interações**: Visualização pura (cards, gráficos, tabela de desvios, docs recentes). Sem ações de escrita.
**Status**: ✅ Funcional com dados reais
**Falta para operador**:
- Filtro de período/quinzena (hardcoded "Q1") — não pode alternar visão por quinzena
- Drill-down nos gráficos (clicar numa barra para ver itens daquele grupo) — nice-to-have

### 3. DOCUMENTOS (`/client`) — Upload + Visualização
**Interações**: Upload de arquivo (drag & drop) → lista de documentos com status
**Status**: ✅ Funcional
**Falta para operador**:
- ⚠️ **Sem classificação automática IA** — documento fica com status "recebido" eternamente. A edge function `classify-document` existe mas não está ativa/conectada ao fluxo de upload
- Sem preview do documento (PDF/imagem) direto na interface

### 4. AUDITORIA (`/audit`) — Core do Operador
**Interações**: Filtros (status, score) → tabela → clicar item → painel de detalhe → aprovar/corrigir/rejeitar
**Status**: ✅ UI completa
**Falta para operador**:
- ⚠️ **Fila vazia** — sem a edge function de classificação IA ativa, não entram itens na fila de auditoria (`classificacoes_ia`). O operador não tem o que auditar
- Sem paginação na tabela (ok enquanto volume é baixo)

### 5. CRONOGRAMA (`/schedule`) — Supervisor+
Operador **não tem acesso**. Correto por design.

### 6. SIMULADOR (`/simulator`) — Supervisor+
Operador **não tem acesso**. Correto por design.

### 7. CONFIGURAÇÕES (`/settings`) — Supervisor+
Operador **não tem acesso**. Correto por design.

### 8. IMPORTAÇÃO (`/import`) — Supervisor+
Operador **não tem acesso**. Correto por design.

---

## O que FALTA para Operadores Usarem o Sistema

### Bloqueador Principal: Pipeline de Classificação IA

O fluxo completo deveria ser:
```text
Upload documento → status "recebido"
       ↓
Edge function classify-document (IA)
       ↓
Cria registro em classificacoes_ia (fornecedor, valor, score)
       ↓
Status muda para "classificado"
       ↓
Operador vê na fila de Auditoria → Aprova/Rejeita
```

Hoje o pipeline para no primeiro passo. A edge function `classify-document` existe no código mas:
1. **Não é chamada automaticamente** após o upload
2. Não está claro se está deployada e funcional
3. Sem ela, a fila de auditoria fica permanentemente vazia

### Solução Proposta (3 itens)

| # | O que fazer | Impacto |
|---|---|---|
| 1 | **Ativar trigger pós-upload** — Após upload de documento, chamar a edge function `classify-document` automaticamente (via database trigger ou chamada direta no hook `useUploadDocument`) | Desbloqueia o fluxo inteiro do operador |
| 2 | **Seed de dados de auditoria para teste** — Inserir 10-15 registros em `classificacoes_ia` com dados realistas do projeto (fornecedores, valores, scores variados) para testar a UI de auditoria imediatamente | Permite testar a tela de auditoria sem esperar a IA |
| 3 | **Filtro de quinzena no Dashboard** — Adicionar seletor de quinzena (Q1-Q10) no header do Dashboard para que operadores vejam dados do período correto | Melhora a usabilidade da única tela analítica que o operador acessa |

### Melhorias Secundárias (Nice-to-have)

| # | O que fazer |
|---|---|
| 4 | Preview de documento (PDF/imagem) no painel de auditoria |
| 5 | Notificações em tempo real quando novo documento chega na fila |
| 6 | Contadores responsivos nos cards de indicadores da auditoria (grid 4 cols quebra no mobile) |

