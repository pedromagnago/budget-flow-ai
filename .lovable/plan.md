

# Tabelas Editáveis de Medições e Cronograma

## Diagnóstico

Hoje o sistema tem 3 problemas de usabilidade:

1. **Medições**: a tabela `medicoes` (8 medições com datas, valores planejados, status, valor liberado) só pode ser alimentada via importação CSV. Não há tela para visualizar/editar medições como uma planilha.

2. **Cronograma**: mostra apenas a matriz serviços x medições com percentuais, mas não mostra os **valores planejados** por medição (R$), datas, status. Falta a visão financeira do planejado.

3. **Configuração**: Serviços, Medições e Metas só entram via `/import`. Não há CRUD direto. Para um sistema essencialista, precisamos de tabelas editáveis inline.

## Plano

### 1. Nova aba "Medições" na página de Cronograma

Adicionar tabs no `Schedule.tsx`: **Avanço Físico** (atual) | **Medições & Pagamentos**

A aba "Medições & Pagamentos" será uma tabela estilo Excel com:

| # | Início | Fim | Valor Planejado | Valor Liberado | % Liberado | Status | Ações |
|---|--------|-----|-----------------|----------------|------------|--------|-------|
| 1 | 01/01  | 15/01 | R$ 500.000 | R$ 450.000 | 90% | liberada | ✏️ |
| 2 | 16/01  | 31/01 | R$ 600.000 | R$ 0 | 0% | em_andamento | ✏️ |

- **Colunas calculadas**: `% Liberado` = valor_liberado / valor_planejado * 100, `Saldo` = planejado - liberado
- **Linha totalizadora** no rodapé com somas
- **Edição inline**: clicar no valor para editar (mesmo padrão do Simulador)
- **Adicionar linha**: botão "Nova Medição" que insere row com defaults
- **Status editável**: dropdown inline (futura, em_andamento, liberada)

### 2. Tabela de Serviços editável

Na mesma página, aba ou seção para gerenciar `cronograma_servicos`:

| Serviço | Valor Total | Qtd Casas | Preço Unit. | Ações |
|---------|-------------|-----------|-------------|-------|
| Fundação | R$ 1.200.000 | 64 | R$ 18.750 | ✏️ 🗑️ |

- Adicionar/remover serviços
- Edição inline
- Preço unitário calculado = valor_total / quantidade

### 3. Cronograma mostra valores planejados

No grid atual de serviços × medições, adicionar uma **linha de cabeçalho** abaixo do "M1, M2..." mostrando o valor planejado de cada medição:

```
Serviço    | M1         | M2         | M3         | ...
           | R$ 500k    | R$ 600k    | R$ 450k    | ...
-----------+------------+------------+------------+----
Fundação   | 12% / 10%  | 15% / 12%  | ...
```

### 4. Hooks CRUD

**`src/hooks/useSchedule.ts`** - adicionar mutations:
- `useCreateMedicao` — insert em `medicoes`
- `useUpdateMedicao` — update valor_planejado, valor_liberado, datas, status
- `useDeleteMedicao` — delete
- `useCreateServico` — insert em `cronograma_servicos`
- `useUpdateServico` — update
- `useDeleteServico` — delete

### 5. Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useSchedule.ts` | Adicionar 6 mutations CRUD (create/update/delete para medições e serviços) |
| `src/pages/schedule/Schedule.tsx` | Adicionar Tabs, criar aba "Medições & Pagamentos" com tabela editável inline, aba "Serviços" com CRUD, e mostrar valores planejados no grid de avanço |
| `src/components/schedule/MedicoesTable.tsx` | **Novo** — Tabela editável de medições com colunas calculadas, edição inline, adicionar/remover linhas, linha totalizadora |
| `src/components/schedule/ServicosTable.tsx` | **Novo** — Tabela editável de serviços do cronograma |

### Resposta às perguntas

- **Como configurar cronograma/simulador?** Hoje só via importação CSV. Com este plano, medições e serviços poderão ser criados/editados direto na tela, sem precisar de CSV.
- **Simulador**: já tem edição inline funcionando (valores e datas). Ele opera sobre `omie_lancamentos` com `e_previsao = true`. Esses lançamentos também podem vir via importação ou serem criados manualmente (futuro).
- **Planejado no cronograma**: será adicionado como linha de valores sob o cabeçalho das medições.

