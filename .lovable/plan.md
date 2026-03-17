

# Guia Completo de Fluxos de Trabalho e Status do Sistema

## Visão Geral

O sistema é uma plataforma de **controle orçamentário para construção de 64 casas**, com 7 módulos principais. Abaixo está o mapa completo de cada fluxo, como usar e o que está funcional vs. pendente.

---

## 1. IMPORTAÇÃO (`/import`) — Porta de Entrada dos Dados

**O que faz**: Permite popular o banco de dados via upload de arquivos CSV.

**Como usar**:
1. Acesse a aba **Orçamento** → Baixe o template CSV → Preencha com seus dados (colunas: grupo, item, apropriacao, tipo, unidade, qtd_unit, qtd_total, custo_unitario, custo_casa, valor_orcado, Q1, Q2...)
2. Faça upload do arquivo → Revise o resumo (grupos detectados, erros) → Clique "Importar"
3. Use as outras abas para importar: Serviços do cronograma, Medições, Metas, Lançamentos financeiros e Categorias De-Para

**Impacto**: Popula `orcamento_grupos`, `orcamento_items` e todas as demais tabelas. É o **primeiro passo obrigatório** para que Dashboard, Cronograma e Simulador funcionem.

| Funcionalidade | Status |
|---|---|
| Upload CSV com detecção automática de separador | Funcional |
| Importação unificada de orçamento (grupos + itens) | Funcional |
| Download de template CSV | Funcional |
| Validação de campos obrigatórios | Funcional |
| Suporte a formato numérico brasileiro (1.234,56) | Funcional |
| Importação de Serviços, Medições, Metas, Lançamentos, Categorias | Funcional |
| Suporte a Excel (.xlsx) | Pendente |
| Histórico de importações realizadas | Pendente |

---

## 2. DASHBOARD (`/dashboard`) — Visão Geral do Projeto

**O que faz**: Exibe indicadores consolidados de orçamento, cronograma e auditoria.

**Como usar**: Acesse `/dashboard`. Os dados são carregados automaticamente das tabelas de orçamento, medições e documentos.

**Impacto**: Somente leitura. Depende de dados previamente importados.

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro (orçado × consumido × saldo) | Funcional |
| Cards resumo (total orçado, consumido, saldo, % execução) | Funcional |
| Gráfico Orçado vs Realizado por grupo | Funcional |
| Curva S (planejado vs realizado acumulado) | Funcional |
| Top 5 desvios | Funcional |
| Gráfico de fluxo de caixa | Funcional |
| Mini card de auditoria | Funcional |
| Widget últimos documentos | Funcional |
| Filtro por quinzena/período | Pendente |
| Dados dinâmicos de quinzena atual (hardcoded "Q01") | Pendente |

---

## 3. AUDITORIA (`/audit`) — Classificação IA de Documentos

**O que faz**: Fila de documentos classificados pela IA para revisão humana. Cada documento recebe score de confiança, categoria proposta e grupo orçamentário sugerido.

**Como usar**: Acesse `/audit` → Filtre por status (pendente/aprovado/rejeitado) → Clique em um item para ver detalhes e aprovar/rejeitar a classificação.

**Impacto**: Ao aprovar, vincula o lançamento ao item orçamentário correto, atualizando `valor_consumido`.

| Funcionalidade | Status |
|---|---|
| Lista de classificações pendentes com filtros | Funcional |
| Indicadores (pendentes, aprovadas hoje, taxa acerto, score médio) | Funcional |
| Painel de detalhes com aprovar/rejeitar | Funcional |
| Edge function de classificação automática de documentos | Pendente |
| Upload de documentos que dispara classificação IA | Pendente |
| Auto-approve para score acima do limiar | Pendente |

---

## 4. CRONOGRAMA (`/schedule`) — Avanço Físico

**O que faz**: Matriz serviços × medições mostrando metas planejadas vs. avanço real (casas concluídas).

**Como usar**: Acesse `/schedule` → Visualize a grade de serviços vs medições → Clique numa célula para registrar avanço físico (modal com % e número de casas).

**Impacto**: Alimenta a Curva S do Dashboard e permite acompanhar o cronograma físico.

| Funcionalidade | Status |
|---|---|
| Matriz serviços × medições com cores por status | Funcional |
| Modal de registro de avanço (casas concluídas, %) | Funcional |
| Painel de impacto no cronograma | Funcional |
| Upload de fotos do avanço | Pendente |
| Alertas de atraso automáticos | Pendente |

---

## 5. SIMULADOR (`/simulator`) — Cenários Financeiros

**O que faz**: Cria cenários "what-if" para simular alterações em valores e datas de pagamento, comparando fluxo de caixa entre cenários.

**Como usar**: Acesse `/simulator` → Crie um cenário → Edite valores/datas nas linhas de previsão → Compare cenários lado a lado no gráfico.

**Impacto**: Não altera dados reais. Permite planejamento financeiro sem risco.

| Funcionalidade | Status |
|---|---|
| Criar/excluir cenários | Funcional |
| Editar valores e datas de previsão | Funcional |
| Gráfico comparativo de fluxo | Funcional |
| Métricas (pico de caixa, data crítica) | Funcional |
| Exportar cenário para PDF/Excel | Pendente |

---

## 6. PORTAL DO CLIENTE (`/client`) — Visão Simplificada

**O que faz**: Interface restrita para o cliente acompanhar orçamento e enviar documentos.

**Como usar**: Acesse `/client` → Visualize a barra orçamentária → Envie documentos via zona de upload → Consulte histórico.

**Impacto**: Documentos enviados entram na fila de auditoria para classificação.

| Funcionalidade | Status |
|---|---|
| Barra Regra de Ouro | Funcional |
| Zona de upload de documentos | Funcional |
| Histórico de documentos | Funcional |
| Tabela orçamento por grupo | Funcional |
| Notificações ao cliente sobre status | Pendente |

---

## 7. CONFIGURAÇÕES (`/settings`) — Administração

**O que faz**: Gerencia empresa, usuários, categorias de-para e alertas.

**Como usar**: Acesse `/settings` → Abas: Empresa (dados e config), Categorias (mapeamento Excel↔Omie), Usuários (convites e roles), Alertas.

**Impacto**: Configura limiares de alerta, score mínimo de auto-approve e gerencia acessos.

| Funcionalidade | Status |
|---|---|
| Editar dados da empresa | Funcional |
| Configurar parâmetros (quinzena, limiar desvio, score auto-approve) | Funcional |
| Gerenciar categorias de-para | Funcional |
| Convidar usuários e definir roles | Funcional |
| Visualizar e marcar alertas como lidos | Funcional |
| Sync automático com Omie ERP | Pendente |

---

## Ordem Recomendada de Uso

```text
1. /settings    → Configurar empresa e convidar usuários
2. /import      → Importar orçamento (CSV único com grupos + itens)
3. /import      → Importar serviços do cronograma + medições + metas
4. /dashboard   → Verificar se dados aparecem nos gráficos
5. /schedule    → Registrar avanço físico conforme obra avança
6. /client      → Cliente envia documentos (notas fiscais, boletos)
7. /audit       → Supervisor revisa classificações da IA
8. /simulator   → Criar cenários para planejamento financeiro
```

## Principais Pendências Globais

1. **Suporte a Excel (.xlsx)** na importação -- hoje só aceita CSV
2. **Edge function de classificação IA** de documentos -- a fila de auditoria existe mas não há processamento automático
3. **Sync automático com Omie ERP** -- lançamentos financeiros precisam ser importados manualmente
4. **Quinzena dinâmica** -- Dashboard mostra "Quinzena 01" hardcoded
5. **Alertas automáticos** de desvio orçamentário e atraso no cronograma

