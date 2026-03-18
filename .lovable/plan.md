

# Análise de Cobertura: Planilha Base vs Sistema Atual

## O que JÁ está coberto

| Seção do MD | Funcionalidade | Status |
|---|---|---|
| 1. Informações Gerais | `companies` (qtd_casas, município, estado) | ✅ Completo |
| 2. Cronograma Quinzenas | `medicoes` (Q1-Q10 com datas e valores) + CRUD editável | ✅ Completo |
| 3. Totais por Etapa | `orcamento_grupos` (nome, valor_total) | ✅ Completo |
| 4. Composição Detalhada | `orcamento_items` (item, tipo, un, qtd, custos, quinzenas JSONB) | ✅ ~90% |
| 5. Medições Receita | Pode usar `omie_lancamentos` tipo=receita e_previsao=true | ⚠️ Parcial |
| 10. Tabela Importação | Smart Import com colunas obrigatórias + quinzenas | ✅ Completo |
| Dashboard | Orçado vs Realizado, S-Curve, Fluxo de Caixa, Desvios | ✅ Completo |
| Simulador | Cenários, ajustes de valor/data, fluxo projetado | ✅ Completo |
| Cronograma Físico | Grid serviços × medições, avanço, edição inline | ✅ Completo |

## O que FALTA (4 lacunas)

### Lacuna 1: Campos de fornecedor/pagamento nos itens do orçamento
A planilha tem campos opcionais que não existem na tabela `orcamento_items`:
- `fornecedor` (razão social)
- `forma_pagamento` (Cartão, Boleto, PIX, Empreita)
- `parcelamento` (6X, 30/60/90, 45 dias após BF)
- `observacoes` (condição de entrega)

**Solução**: Migration para adicionar 4 colunas nullable em `orcamento_items`. Atualizar o Smart Import para mapear esses campos. Sem impacto em código existente.

### Lacuna 2: Receita de venda (SEHAB) e Margem
O MD define 8 medições de RECEITA (R$ 7.360.000) com serviços e preços unitários. O sistema rastreia custos mas não receitas de forma estruturada. O Dashboard não mostra margem bruta.

**Solução**: 
- Usar `omie_lancamentos` com `tipo='receita'` + `e_previsao=true` para lançar as 8 medições SEHAB
- Adicionar cards de Receita e Margem no Dashboard (query simples: soma receitas - soma custos)
- A importação de `omie_lancamentos` já suporta tipo=receita

### Lacuna 3: Distribuição por quinzena nos itens (Q1-Q10)
O campo `quinzenas` JSONB em `orcamento_items` já armazena a distribuição, mas **não existe UI para visualizar ou editar**. A planilha mostra isso como colunas Q1 a Q10 com % de cada item.

**Solução**: Criar uma visualização na página de orçamento que mostre a distribuição por quinzena, com edição inline do JSONB. Isso permite ver o fluxo de caixa planejado por item.

### Lacuna 4: Gestão de equipe e contratos
Seções 6-9 detalham equipe (Charles), subempreitadas (Dione), contrato de paredes pré-moldadas e cronograma de entregas de materiais. Isso não existe no sistema.

**Solução recomendada**: Não criar módulos novos agora. Esses dados podem ser controlados como `omie_lancamentos` com `e_previsao=true`, agrupados por `fornecedor_razao` (Charles, Dione, Fábrica Paredes). O Simulador já permite manipular esses lançamentos. Para o futuro, uma tela de "Contratos" pode agregar lançamentos por fornecedor.

---

## Plano de Implementação (Priorizado)

### Fase 1: Schema + Import (rápido)
1. **Migration**: Adicionar 4 colunas em `orcamento_items`: `fornecedor text`, `forma_pagamento text`, `parcelamento text`, `observacoes text`
2. **Smart Import**: Mapear os novos campos opcionais no `useSmartImport.ts`

### Fase 2: Receita e Margem no Dashboard
3. **Dashboard**: Adicionar query de receitas (`omie_lancamentos` onde `tipo='receita'`), calcular margem, exibir 2 cards novos: "Receita Prevista" e "Margem Bruta"
4. **S-Curve**: Incluir linha de receita acumulada no gráfico existente

### Fase 3: Visualização de Quinzenas
5. **Orçamento page ou tab**: Grid mostrando itens × quinzenas com os valores de distribuição do JSONB, com edição inline

### Arquivos a editar
| Arquivo | Mudança |
|---|---|
| Migration SQL | ADD COLUMN fornecedor, forma_pagamento, parcelamento, observacoes em orcamento_items |
| `src/hooks/useSmartImport.ts` | Mapear 4 novos campos opcionais |
| `src/hooks/useDashboard.ts` | Query receitas, calcular margem |
| `src/components/dashboard/SummaryCards.tsx` | Cards de Receita e Margem |
| `src/components/dashboard/SCurveChart.tsx` | Linha de receita acumulada |

**Resumo**: O sistema já cobre ~85% da planilha. As lacunas principais são campos de fornecedor/pagamento (schema simples), receita/margem no Dashboard (query + UI), e visualização de quinzenas. Equipe e contratos podem ser controlados via lançamentos previstos no Simulador, sem criar módulos novos.

