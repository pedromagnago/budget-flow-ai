# Guia Completo de Fluxos de Trabalho e Status do Sistema

## Visão Geral

O sistema é uma plataforma de **controle orçamentário para construção de 64 casas**, com módulos principais integrados.

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
| Fluxo quinzenal por grupo | ✅ |
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
| Upload → classificação automática | ✅ |
| Auto-approve por score (configurável) | ✅ |
| Preview de documento no painel de detalhe | ⏳ |
| Paginação da tabela | ⏳ |

## 4. CRONOGRAMA (`/planejamento`) — Avanço Físico

| Funcionalidade | Status |
|---|---|
| Matriz serviços × medições | ✅ |
| Modal registro de avanço | ✅ |
| Painel de impacto | ✅ |
| Upload de fotos | ⏳ |
| Alertas de atraso | ⏳ |

## 5. FINANCEIRO (`/financeiro`) — Gestão Nativa

| Funcionalidade | Status |
|---|---|
| Contas a pagar com filtros e totais | ✅ |
| Contas a receber | ✅ |
| Planejamento por quinzena | ✅ |
| Registrar pagamento/recebimento | ✅ |
| Parcelamento de lançamentos | ✅ |
| Edição inline | ✅ |
| Botão flutuante de ação rápida | ✅ |

## 6. BANCÁRIO (`/banking`) — Gestão Bancária

| Funcionalidade | Status |
|---|---|
| Cadastro de contas bancárias | ✅ |
| Movimentações com filtros | ✅ |
| Transferências internas | ✅ |
| Conciliação bancária | ✅ |
| Ajuste de saldo | ✅ |

## 7. SIMULADOR (`/simulator`) — Cenários Financeiros

| Funcionalidade | Status |
|---|---|
| Criar/excluir cenários | ✅ |
| Editar valores e datas | ✅ |
| Gráfico comparativo | ✅ |
| Métricas | ✅ |
| Exportar PDF/Excel | ⏳ |

## 8. RELATÓRIOS (`/relatorios`)

| Funcionalidade | Status |
|---|---|
| Fluxo de caixa com export Excel | ✅ |
| Contas a pagar/receber com export Excel | ✅ |

## 9. NOTIFICAÇÕES (`/notificacoes`)

| Funcionalidade | Status |
|---|---|
| Geração automática de alertas | ✅ |
| Sino no header com contagem | ✅ |
| Página de gerenciamento | ✅ |
| Tempo real via Supabase Realtime | ✅ |

## 10. PORTAL DO CLIENTE (`/client`)

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro | ✅ |
| Upload de documentos (com classificação IA automática) | ✅ |
| Histórico de documentos | ✅ |
| Tabela orçamento por grupo | ✅ |

## 11. CONFIGURAÇÕES (`/settings`)

| Funcionalidade | Status |
|---|---|
| Editar dados da empresa | ✅ |
| Configurar parâmetros | ✅ |
| Categorias de-para | ✅ |
| Convidar usuários e roles | ✅ |
| Alertas e Notificações | ✅ |

## Mapa de Acesso por Papel (Role)

| Página | cliente | operador | supervisor | super_admin |
|---|---|---|---|---|
| Dashboard | ✗ | ✓ | ✓ | ✓ |
| Documentos | ✓ | ✓ | ✓ | ✓ |
| Auditoria | ✗ | ✓ | ✓ | ✓ |
| Cronograma | ✗ | ✗ | ✓ | ✓ |
| Financeiro | ✗ | ✓ | ✓ | ✓ |
| Bancário | ✗ | ✓ | ✓ | ✓ |
| Simulador | ✗ | ✗ | ✓ | ✓ |
| Relatórios | ✗ | ✓ | ✓ | ✓ |
| Configurações | ✗ | ✗ | ✓ | ✓ |
| Importação | ✗ | ✗ | ✓ | ✓ |

## Ordem Recomendada de Uso

1. `/settings` → Configurar empresa e usuários
2. `/import` → Importar orçamento (CSV único)
3. `/import` → Importar serviços + medições + metas
4. `/dashboard` → Verificar dados nos gráficos
5. `/planejamento` → Registrar avanço físico
6. `/client` → Cliente envia documentos
7. `/audit` → Revisar classificações IA
8. `/financeiro` → Gestão de contas a pagar/receber
9. `/banking` → Conciliação bancária
10. `/simulator` → Planejamento financeiro

## Pendências Globais

1. Suporte a Excel (.xlsx) na importação
2. Preview de documentos no painel de auditoria
3. UI de distribuição por quinzena (Q1-Q10) dos itens do orçamento
4. Exportar cenários como PDF/Excel
