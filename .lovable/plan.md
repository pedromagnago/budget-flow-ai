

## Importação Unificada de Orçamento

### Conceito

Substituir as abas separadas de "Grupos" e "Itens" por uma **única planilha flat** onde cada linha representa um item do orçamento. O sistema detecta automaticamente os grupos distintos na coluna `grupo`, cria os registros em `orcamento_grupos`, e insere todos os itens em `orcamento_items` com os `grupo_id` corretos -- tudo em um único upload.

### Estrutura da Planilha Template

Uma tabela CSV/XLSX com estas colunas:

| grupo | item | apropriacao | tipo | unidade | qtd_unit | qtd_total | custo_unitario | custo_casa | valor_orcado |
|-------|------|-------------|------|---------|----------|-----------|----------------|------------|-------------|
| FUNDAÇÃO | Estaca raiz | 1.1.01 | MO | un | 12 | 768 | 45.00 | 540.00 | 34560.00 |
| FUNDAÇÃO | Bloco | 1.1.02 | MAT | m³ | ... | ... | ... | ... | ... |
| ESTRUTURA | Forma | 2.1.01 | MO | m² | ... | ... | ... | ... | ... |

O usuário pode adicionar colunas extras de quinzenas (Q1, Q2, ..., Q30) que serão capturadas como JSONB.

### Fluxo na Interface

1. **Download do template** -- botao para baixar CSV modelo com headers corretos e 2 linhas de exemplo
2. **Upload** -- arrastar ou selecionar arquivo CSV
3. **Preview** -- tabela com as primeiras linhas + resumo: X grupos detectados, Y itens
4. **Validação** -- checagem de campos obrigatórios, valores numéricos, grupos sem itens
5. **Importar** -- inserção em cascata: primeiro `orcamento_grupos` (valores agregados por grupo), depois `orcamento_items` com `grupo_id` resolvido

### Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSmartImport.ts` | Criar -- hook com lógica de parsing, agrupamento, validação e inserção cascata |
| `src/pages/import/ImportPage.tsx` | Refatorar -- substituir abas de grupos/itens por fluxo unificado "Orçamento", manter abas de outras tabelas |
| `src/hooks/useImport.ts` | Manter -- continua servindo as outras abas (medições, lançamentos, etc.) |

### Lógica do Hook `useSmartImport`

- Parseia CSV e identifica a coluna `grupo`
- Agrupa linhas por grupo, soma `valor_orcado` de cada grupo para gerar `valor_total` do grupo
- Detecta colunas que começam com "Q" seguido de número como quinzenas
- Insere grupos via `supabase.from('orcamento_grupos').insert()`, recupera IDs
- Mapeia cada item ao `grupo_id` correspondente e insere em `orcamento_items`
- Retorna contagem de sucesso/erro

### Validações Antes de Importar

- Campos obrigatórios: `grupo`, `item`, `apropriacao`, `valor_orcado`
- Valores numéricos válidos (suporta formato brasileiro com vírgula)
- Alerta se já existem grupos cadastrados (opção de limpar antes)

