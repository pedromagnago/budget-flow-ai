

## Status Atual e Etapas Restantes

### Concluído
- **Etapa 1** -- Fundação (layout, auth, routing, design system, sidebar, header)
- **Etapa 2** -- Schema do banco (16 tabelas, RLS, triggers, views, seed parcial), hooks básicos

### O que falta -- 6 etapas

---

### Etapa 3 -- Dashboard com dados reais
O Dashboard existe mas usa dados hardcoded. Falta:
- Conectar cards resumo à view materializada `v_orcado_vs_realizado`
- Gráfico barras Orçado x Realizado com dados do banco
- Curva S com acumulado real das medições
- Tabela Top 5 desvios com dados reais
- Gráfico fluxo de caixa projetado
- Widget últimos documentos e fila de auditoria com dados reais
- Skeleton loading em todos os widgets

---

### Etapa 4 -- Fila de Auditoria funcional
A tela atual é estática com dados demo. Falta:
- Lista de classificações pendentes do banco (`classificacoes_ia` + filtros por status/score/departamento)
- Tela de detalhe split-view: preview do documento (PDF/imagem do Storage) + proposta da IA
- Ações Aprovar / Corrigir / Rejeitar com mutations reais (inserção em `audit_logs`, atualização de status, notificação)
- Campo de motivo obrigatório na rejeição
- Modal de correção (editar departamento, categoria, item, valor)
- Indicadores no topo com dados reais (pendentes, aprovadas hoje, taxa acerto, tempo médio)

---

### Etapa 5 -- Portal do Cliente funcional
Tela atual é mockup estático. Falta:
- Upload drag-and-drop real com Supabase Storage (PDF, JPG, PNG, XML, limite 10MB)
- Histórico de envios com dados do banco (`documentos`) + status badges
- Expandir linha para ver classificação da IA e motivo de rejeição
- Visão resumida do orçamento por grupo com dados reais (cards + tabela com barras de progresso)
- Validação de tipo/tamanho de arquivo com feedback

---

### Etapa 6 -- Cronograma Físico funcional
Grid existe com dados demo. Falta:
- Dados reais dos 32 serviços x 8 medições do banco (`cronograma_servicos`, `medicoes_metas`, `avanco_fisico`)
- Modal de registro: "Quantas casas com [serviço] concluído?" com input numérico + mutation
- Coluna % geral por serviço
- Painel de impacto: lista das 8 medições com status (no prazo/em risco/atrasada), serviços abaixo da meta, impacto financeiro estimado

---

### Etapa 7 -- Simulador de Cenários funcional
Tela atual é layout estático. Falta:
- CRUD de cenários (criar/renomear/deletar) com dados do banco (`cenarios`)
- Lista editável de previsões inline: date picker, input BRL, parcelamento (modal N parcelas)
- Gráfico de fluxo de caixa recalculado em tempo real conforme edição
- Modo comparação: múltiplas linhas sobrepostas + legenda
- Cards resumo: saldo mínimo projetado, data do pior dia, dias com saldo negativo
- Highlight visual de linhas alteradas vs originais

---

### Etapa 8 -- Configurações completas
Apenas "Projeto" e "IA" têm formulários; as outras 7 tabs mostram placeholder. Falta:
- **Omie**: campos App Key/Secret mascarados, frequência sync, botões testar/sync, último sync
- **Categorias**: tabela editável dos 29 mapeamentos Excel ↔ Omie (CRUD inline)
- **Alertas**: sliders limiar atenção/crítico, multi-select grupos, toggles email/dashboard, tempo máximo fila
- **Orçamento**: upload reimportação Excel, tabela quinzenas editável, log revisões
- **Usuários**: lista com role/status/último acesso, convidar (email+role), alterar role, desativar
- **Portal**: tipos arquivo aceitos, tamanho máximo, toggles notificação, toggle saldo por grupo
- **Dashboard**: lista widgets com toggle on/off e drag-and-drop reordenação

---

### Resumo de esforço estimado

| Etapa | Descrição | Complexidade |
|-------|-----------|-------------|
| 3 | Dashboard dados reais | Média |
| 4 | Auditoria funcional | Alta |
| 5 | Portal do Cliente | Média |
| 6 | Cronograma Físico | Média |
| 7 | Simulador | Alta |
| 8 | Configurações (7 tabs) | Média-Alta |

Recomendo implementar na ordem acima (3 → 8), uma etapa por vez, para manter as mudanças gerenciáveis e testáveis.

