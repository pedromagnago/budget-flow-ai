# Projeto SFP — Arquitetura do Sistema

## Visão Geral

Plataforma web que centraliza o controle orçamentário do projeto de 64 casas, conectando 3 fontes de dados (Excel orçamento, Omie ERP, documentos do cliente) numa única interface com IA classificadora e auditoria humana.

---

## Arquitetura dos 6 Módulos

### M1 — Portal do Cliente (`/client`)
Interface simplificada para o gestor de obra.
- Upload de documentos (NF, pedido, comprovante, foto)
- Histórico de envios com status (processando → auditoria → aprovado/rejeitado)
- Visão resumida: orçamento consumido vs saldo disponível por grupo
- Sem necessidade de conhecimento do Omie ou contabilidade

**Acesso:** cliente (Gestão Sucopira)

### M2 — IA Classificadora (Edge Function)
Motor inteligente que processa documentos e propõe lançamentos.
- OCR + Claude API para extração de dados
- Classificação automática (departamento + categoria Omie)
- Match com previsão orçamentária existente
- Cálculo de saldo remanescente
- Score de confiança (0-1)

**Acesso:** automático (sem interface direta)

### M3 — Fila de Auditoria (`/audit`)
Centro de trabalho do time FullBPO.
- Lista de propostas da IA pendentes de revisão
- Documento original lado a lado com proposta
- 3 ações: aprovar, corrigir, rejeitar
- Indicadores: taxa de acerto da IA, volume pendente, tempo médio de auditoria

**Acesso:** operador, supervisor

### M4 — Execução Omie (Edge Function)
Integração bidirecional com o Omie via API.
- Criar conta a pagar real (IncluirContaPagar)
- Ajustar/excluir previsão consumida (AlterarContaPagar / ExcluirContaPagar)
- Manter saldo remanescente como previsão futura
- Sync diário: pull de todos os lançamentos atualizados

**Acesso:** automático (disparado pela auditoria)

### M5 — Banco de Dados (Supabase/Postgres)
Fundação de tudo.
- Tabelas: orçamento, realizado, documentos, fila de auditoria, de-para, audit log
- Views materializadas: orçado × realizado, curva S, desvios
- Edge Functions agendadas via pg_cron
- PostgREST API automática para o dashboard

**Acesso:** interno (sem interface direta)

### M6 — Dashboard (`/dashboard`)
Painel web de controle gerencial.
- Comparativo Orçado × Realizado por grupo e quinzena
- Curva S acumulada do projeto
- Alertas de desvio (quando categoria > X% do orçado)
- Projeção de fluxo de caixa (real + saldo futuro)
- Drill-down por fornecedor, por quinzena, por item

**Acesso:** todos (com visão adequada ao role)

---

## Stack Tecnológica

### Frontend
```
React 18 + TypeScript + Vite
Tailwind CSS
TanStack Query (React Query) — server state
React Hook Form + Zod — formulários
React Router v6
Recharts — gráficos (Curva S, barras comparativas)
```

### Backend
```
Supabase
  ├── PostgreSQL — banco relacional + views materializadas
  ├── Auth — autenticação (email/senha)
  ├── Storage — documentos do cliente (NFs, comprovantes)
  ├── Edge Functions — IA classificadora + integração Omie
  └── pg_cron — agendamento de sync diário
```

### IA
```
Claude API (Anthropic)
  ├── Extração de dados de documentos (OCR)
  ├── Classificação (departamento + categoria)
  └── Match com orçamento (localização de previsão)
```

### Integração
```
Omie API v1
  ├── /financas/contapagar/ — CRUD de contas a pagar
  ├── /financas/contareceber/ — CRUD de contas a receber
  ├── /geral/categorias/ — listar categorias
  └── /geral/clientes/ — listar fornecedores
```

---

## Jornadas Críticas

### 1. Cliente envia documento
```
Upload no portal → Storage (Supabase)
→ Edge Function "process-document"
  → OCR + Claude API extrai dados
  → Classifica departamento + categoria
  → Localiza previsão(ões) no orçamento
  → Calcula saldo remanescente
  → Insere na fila de auditoria com score de confiança
→ Notifica time FullBPO
→ Atualiza status no portal do cliente: "Em auditoria"
```

### 2. Auditor revisa proposta
```
Abre fila de auditoria → vê proposta da IA
→ Documento original (lado esquerdo)
→ Proposta (lado direito): fornecedor, valor, dept, categoria, previsão vinculada, saldo
→ Ação:
  - APROVAR → dispara Edge Function "execute-omie"
  - CORRIGIR → ajusta campos → APROVAR
  - REJEITAR → motivo obrigatório → notifica cliente
→ Audit log registra ação + quem + quando
```

### 3. Execução no Omie (pós-aprovação)
```
Edge Function "execute-omie":
  1. IncluirContaPagar — cria título real no Omie
  2. Localiza previsão(ões) correspondente(s)
  3. SE valor_real >= valor_previsão:
       → ExcluirContaPagar da previsão (consumo total)
     SE valor_real < valor_previsão:
       → AlterarContaPagar da previsão (reduz valor = saldo remanescente)
  4. Registra operação no audit_log
  5. Atualiza status no portal: "Aprovado e lançado no Omie"
```

### 4. Sync diário (automático)
```
pg_cron dispara Edge Function "sync-omie" (06:00 diário):
  1. ListarContasPagar — puxa todos os títulos atualizados
  2. ListarContasReceber — puxa recebíveis
  3. Upsert no Supabase (tabela omie_lancamentos)
  4. Refresh das views materializadas
  5. Calcula desvios (orçado vs realizado por grupo)
  6. SE desvio > limiar configurado → gera alerta
```

### 5. Dashboard atualizado
```
PostgREST API serve views materializadas:
  - v_orcado_vs_realizado (por grupo, quinzena)
  - v_curva_s (acumulado temporal)
  - v_alertas_desvio (categorias com desvio > X%)
  - v_fluxo_caixa_projetado (real + saldo futuro)
```

---

## Segurança

### Auth
- Supabase Auth — email/senha
- Session timeout: 8h operadores, 2h clientes
- Roles: `super_admin`, `supervisor`, `operador`, `cliente`

### Multi-tenant (RLS)
```sql
-- Toda tabela filtra por company_id via RLS
CREATE POLICY "project_isolation" ON orcamento_items
  FOR ALL USING (
    user_can_access_company(auth.uid(), company_id)
  );
```

### Credenciais Omie
- App Key e App Secret armazenados no Supabase Vault (criptografado)
- Nunca expostos no frontend
- Edge Functions acessam via `Deno.env`

### Audit Trail
- Insert-only em `audit_logs`
- Toda ação da IA registrada (com input, output, score)
- Toda ação humana registrada (com quem, quando, o quê mudou)
- Retenção: 5 anos

---

## Matriz de Acesso

| Módulo | super_admin | supervisor | operador | cliente |
|---|---|---|---|---|
| M1 Portal Cliente | ✅ | ✅ | ✅ | ✅ |
| M3 Fila Auditoria | ✅ | ✅ | ✅ | ❌ |
| M6 Dashboard completo | ✅ | ✅ | ✅ | ❌ |
| M6 Dashboard resumido | ✅ | ✅ | ✅ | ✅ |
| Configurações | ✅ | ✅ | ❌ | ❌ |

---

## Estrutura de Pastas (Frontend)

```
src/
├── pages/
│   ├── client/           # M1 — Portal do Cliente
│   │   ├── Upload.tsx
│   │   ├── History.tsx
│   │   └── BudgetSummary.tsx
│   ├── audit/            # M3 — Fila de Auditoria
│   │   ├── Queue.tsx
│   │   ├── ReviewDetail.tsx
│   │   └── AuditStats.tsx
│   ├── dashboard/        # M6 — Dashboard
│   │   ├── Overview.tsx
│   │   ├── BudgetVsActual.tsx
│   │   ├── SCurve.tsx
│   │   ├── CashFlow.tsx
│   │   └── Alerts.tsx
│   └── settings/         # Configurações
│       ├── Categories.tsx
│       ├── Thresholds.tsx
│       └── OmieSync.tsx
├── components/
│   ├── ui/               # Design System
│   ├── layout/           # Sidebar, Header
│   └── shared/           # Componentes reutilizáveis
├── hooks/
│   ├── useBudget.ts
│   ├── useAuditQueue.ts
│   ├── useOmieSync.ts
│   └── useDashboard.ts
├── lib/
│   ├── supabase.ts
│   ├── omie.ts
│   └── utils.ts
└── types/
    └── supabase.ts       # Gerado automaticamente
```

### Edge Functions (Supabase)

```
supabase/functions/
├── process-document/     # M2 — IA classifica documento
├── execute-omie/         # M4 — Cria real + ajusta previsão no Omie
├── sync-omie/            # M4 — Sync diário (pg_cron)
└── refresh-views/        # M5 — Atualiza views materializadas
```

---

## Roadmap de Construção

### Fase 1 — Fundação (M5 Banco)
- [ ] Schema Supabase completo + RLS
- [ ] Carga inicial do orçamento (Excel → tabelas)
- [ ] De-para categorias Excel ↔ Omie
- [ ] Views materializadas
- [ ] Auth + roles

### Fase 2 — Motor IA (M2 + M4)
- [ ] Edge Function process-document (OCR + classificação)
- [ ] Lógica de match com orçamento
- [ ] Cálculo de saldo remanescente
- [ ] Edge Function execute-omie (CRUD via API)
- [ ] Edge Function sync-omie (pull diário)

### Fase 3 — Interface Operacional (M3 + M1)
- [ ] Fila de auditoria (aprovar/corrigir/rejeitar)
- [ ] Portal do cliente (upload + histórico)
- [ ] Notificações (Realtime)

### Fase 4 — Visibilidade (M6)
- [ ] Dashboard orçado × realizado
- [ ] Curva S
- [ ] Alertas de desvio
- [ ] Fluxo de caixa projetado

### Fase 5 — Refinamento
- [ ] Tela de configurações (limiares, categorias)
- [ ] Relatórios para investidor
- [ ] Histórico de revisões orçamentárias
- [ ] Performance e polish
