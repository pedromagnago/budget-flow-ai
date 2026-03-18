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
| Campos opcionais: fornecedor, forma_pagamento, parcelamento, observacoes | ✅ |
| Suporte a Excel (.xlsx) | ⏳ |
| Histórico de importações | ⏳ |

## 2. DASHBOARD (`/dashboard`) — Visão Geral

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro | ✅ |
| Cards resumo (Orçado, Consumido, Saldo, % Execução) | ✅ |
| Cards Receita Prevista e Margem Bruta | ✅ |
| Gráfico Orçado vs Realizado | ✅ |
| Curva S (com linha de receita acumulada) | ✅ |
| Top 5 desvios | ✅ |
| Fluxo de caixa | ✅ |
| Mini card auditoria | ✅ |
| Últimos documentos | ✅ |
| Filtro por quinzena (Q1-Q10) | ✅ |
| Drill-down nos gráficos | ⏳ |

## 3. AUDITORIA (`/audit`) — Classificação IA

| Funcionalidade | Status |
|---|---|
| Lista de classificações com filtros (status, score) | ✅ |
| Indicadores (pendentes, aprovadas, taxa acerto, score médio) | ✅ |
| Painel aprovar/corrigir/rejeitar com audit log | ✅ |
| Edge function classificação IA (Gemini + tool calling) | ✅ |
| Upload → classificação automática (chamada no useUploadDocument) | ✅ |
| Dados de teste para validação da UI | ✅ |
| Auto-approve por score (configurável) | ✅ |
| Preview de documento no painel de detalhe | ⏳ |
| Paginação da tabela | ⏳ |

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
| Upload de documentos (com classificação IA automática) | ✅ |
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

## Mapa de Acesso por Papel (Role)

| Página | cliente | operador | supervisor | super_admin |
|---|---|---|---|---|
| Dashboard | ✗ | ✓ | ✓ | ✓ |
| Documentos | ✓ | ✓ | ✓ | ✓ |
| Auditoria | ✗ | ✓ | ✓ | ✓ |
| Cronograma | ✗ | ✗ | ✓ | ✓ |
| Simulador | ✗ | ✗ | ✓ | ✓ |
| Configurações | ✗ | ✗ | ✓ | ✓ |
| Importação | ✗ | ✗ | ✓ | ✓ |

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
2. Sync automático com Omie ERP
3. Preview de documentos no painel de auditoria
4. Alertas automáticos de desvio e atraso
5. UI de distribuição por quinzena (Q1-Q10) dos itens do orçamento
