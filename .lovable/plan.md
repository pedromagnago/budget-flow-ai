# Guia Completo de Fluxos de Trabalho e Status do Sistema

## Visão Geral

O sistema é uma plataforma de **controle orçamentário para construção de 64 casas**, com 7 módulos principais.

---

## 1. IMPORTAÇÃO (`/import`) — Porta de Entrada dos Dados

**Como usar**:
1. Aba **Orçamento** → Baixe template CSV → Preencha → Upload → Revise → Importar
2. Outras abas: Serviços, Medições, Metas, Lançamentos, Categorias

| Funcionalidade | Status |
|---|---|
| Upload CSV com detecção automática de separador | ✅ |
| Importação unificada de orçamento (grupos + itens) | ✅ |
| Download de template CSV | ✅ |
| Validação de campos obrigatórios | ✅ |
| Suporte a formato numérico brasileiro | ✅ |
| Importação de Serviços, Medições, Metas, Lançamentos, Categorias | ✅ |
| Suporte a Excel (.xlsx) | ⏳ |
| Histórico de importações | ⏳ |

## 2. DASHBOARD (`/dashboard`) — Visão Geral

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro | ✅ |
| Cards resumo | ✅ |
| Gráfico Orçado vs Realizado | ✅ |
| Curva S | ✅ |
| Top 5 desvios | ✅ |
| Fluxo de caixa | ✅ |
| Mini card auditoria | ✅ |
| Últimos documentos | ✅ |
| Filtro por quinzena/período | ⏳ |
| Quinzena dinâmica (hardcoded "Q01") | ⏳ |

## 3. AUDITORIA (`/audit`) — Classificação IA

| Funcionalidade | Status |
|---|---|
| Lista de classificações com filtros | ✅ |
| Indicadores | ✅ |
| Painel aprovar/rejeitar | ✅ |
| Edge function classificação IA | ⏳ |
| Upload → classificação automática | ⏳ |
| Auto-approve por score | ⏳ |

## 4. CRONOGRAMA (`/schedule`) — Avanço Físico

| Funcionalidade | Status |
|---|---|
| Matriz serviços × medições | ✅ |
| Modal registro de avanço | ✅ |
| Painel de impacto | ✅ |
| Upload de fotos | ⏳ |
| Alertas de atraso | ⏳ |

## 5. SIMULADOR (`/simulator`) — Cenários Financeiros

| Funcionalidade | Status |
|---|---|
| Criar/excluir cenários | ✅ |
| Editar valores e datas | ✅ |
| Gráfico comparativo | ✅ |
| Métricas | ✅ |
| Exportar PDF/Excel | ⏳ |

## 6. PORTAL DO CLIENTE (`/client`)

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro | ✅ |
| Upload de documentos | ✅ |
| Histórico de documentos | ✅ |
| Tabela orçamento por grupo | ✅ |
| Notificações ao cliente | ⏳ |

## 7. CONFIGURAÇÕES (`/settings`)

| Funcionalidade | Status |
|---|---|
| Editar dados da empresa | ✅ |
| Configurar parâmetros | ✅ |
| Categorias de-para | ✅ |
| Convidar usuários e roles | ✅ |
| Alertas | ✅ |
| Sync automático Omie | ⏳ |

## Ordem Recomendada de Uso

1. `/settings` → Configurar empresa e usuários
2. `/import` → Importar orçamento (CSV único)
3. `/import` → Importar serviços + medições + metas
4. `/dashboard` → Verificar dados nos gráficos
5. `/schedule` → Registrar avanço físico
6. `/client` → Cliente envia documentos
7. `/audit` → Revisar classificações IA
8. `/simulator` → Planejamento financeiro

## Pendências Globais

1. Suporte a Excel (.xlsx) na importação
2. Edge function de classificação IA de documentos
3. Sync automático com Omie ERP
4. Quinzena dinâmica no Dashboard
5. Alertas automáticos de desvio e atraso
