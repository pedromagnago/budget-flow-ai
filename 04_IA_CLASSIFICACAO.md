# Projeto SFP — IA Classificadora (Lógica, Prompts, Consumo de Orçamento)

## Visão Geral

A IA é o motor que transforma um documento bruto (NF, pedido, comprovante) em um lançamento financeiro classificado, vinculado ao orçamento, com saldo remanescente calculado. Ela nunca age sozinha — sempre propõe para auditoria humana.

---

## Pipeline de Processamento

```
Documento (upload) → OCR + Extração → Classificação → Match Orçamento → Cálculo Saldo → Proposta
```

### Etapa 1 — Extração de dados (OCR + LLM)

**Input:** Arquivo (PDF, imagem, XML de NF-e)  
**Output:** Dados estruturados (fornecedor, CNPJ, valor, itens, data)

```typescript
// Edge Function: process-document
// Prompt para Claude API

const EXTRACTION_PROMPT = `
Você é um assistente financeiro especializado em obras de construção civil.
Analise este documento e extraia as seguintes informações em JSON:

{
  "tipo_documento": "nf_entrada | pedido_compra | comprovante_pagamento | orcamento | contrato | outro",
  "fornecedor": {
    "razao_social": "string",
    "cnpj": "string ou null",
    "nome_fantasia": "string ou null"
  },
  "valor_total": number,
  "data_emissao": "YYYY-MM-DD ou null",
  "data_vencimento": "YYYY-MM-DD ou null",
  "condicao_pagamento": "string ou null (ex: '30/60/90')",
  "itens": [
    {
      "descricao": "string",
      "quantidade": number,
      "unidade": "string",
      "valor_unitario": number,
      "valor_total": number
    }
  ],
  "observacoes": "string — qualquer informação relevante adicional"
}

Se algum campo não estiver legível ou não existir no documento, retorne null.
Valores monetários em BRL. Datas no formato ISO.
`
```

### Etapa 2 — Classificação (departamento + categoria)

**Input:** Dados extraídos + tabela de referência do orçamento  
**Output:** Departamento Omie + Categoria Omie + Grupo orçamentário

```typescript
const CLASSIFICATION_PROMPT = `
Você é um classificador financeiro de obras de construção civil.

CONTEXTO DO PROJETO:
- 64 casas em São Francisco de Paula/RS
- Orçamento organizado em: Grupo > Apropriação > Tipo > Item

TABELA DE DEPARTAMENTOS OMIE DISPONÍVEIS:
${departamentosOmie.map(d => `- ${d.departamento_omie} → Excel: ${d.apropriacao_excel}`).join('\n')}

TABELA DE CATEGORIAS OMIE DISPONÍVEIS:
${categoriasOmie.join(', ')}

DADOS DO DOCUMENTO:
- Fornecedor: ${dados.fornecedor.razao_social}
- Itens: ${JSON.stringify(dados.itens)}
- Valor total: R$ ${dados.valor_total}

CLASSIFIQUE retornando JSON:
{
  "departamento_omie": "string — nome exato da lista acima",
  "categoria_omie": "string — nome exato da lista acima",
  "grupo_orcamento": "string — nome do grupo orçamentário",
  "justificativa": "string — explicação curta de por que esta classificação",
  "score_confianca": number (0.0 a 1.0)
}

REGRAS:
- Use APENAS departamentos e categorias da lista fornecida
- Se não tiver certeza, reduza o score_confianca
- Score < 0.5 = muito incerto, será rejeitado automaticamente
- Priorize o match pela descrição dos itens, não pelo nome do fornecedor
- Fornecedores podem vender itens de diferentes departamentos
`
```

### Etapa 3 — Match com orçamento

**Input:** Classificação (departamento + categoria) + tabela `orcamento_items`  
**Output:** Item orçamentário vinculado + saldo disponível

```typescript
// Lógica de match (SQL na Edge Function)
const matchQuery = `
  SELECT
    oi.id,
    oi.item,
    oi.valor_orcado,
    oi.valor_consumido,
    oi.valor_saldo,
    oi.tipo,
    oi.apropriacao,
    og.nome AS grupo
  FROM orcamento_items oi
  JOIN orcamento_grupos og ON oi.grupo_id = og.id
  WHERE oi.company_id = $1
    AND UPPER(oi.apropriacao) = UPPER($2)  -- departamento sem prefixo
    AND UPPER(oi.tipo) = UPPER($3)          -- categoria
    AND oi.valor_saldo > 0                  -- ainda tem saldo
    AND oi.ativo = true
  ORDER BY
    -- priorizar item com descrição mais similar
    similarity(oi.item, $4) DESC,
    -- depois o com mais saldo disponível
    oi.valor_saldo DESC
  LIMIT 5
`;
```

Se houver múltiplos matches, a IA usa um segundo prompt para decidir qual item orçamentário é o mais provável:

```typescript
const MATCH_PROMPT = `
O documento é de: ${dados.fornecedor.razao_social}
Itens do documento: ${JSON.stringify(dados.itens)}

Candidatos orçamentários encontrados:
${matches.map((m, i) => `${i+1}. "${m.item}" — Orçado: R$ ${m.valor_orcado}, Saldo: R$ ${m.valor_saldo}, Tipo: ${m.tipo}`).join('\n')}

Qual candidato é o match correto? Retorne:
{
  "match_index": number (1-based),
  "score": number (0.0 a 1.0),
  "justificativa": "string"
}
Se nenhum candidato é adequado, retorne match_index: 0.
`
```

### Etapa 4 — Cálculo de saldo remanescente

```typescript
interface ConsumoCalculo {
  orcamento_item_id: string
  valor_orcado: number
  valor_ja_consumido: number
  valor_saldo_antes: number
  valor_documento: number
  valor_saldo_depois: number
  consumo_tipo: 'parcial' | 'total' | 'excede'
}

function calcularConsumo(item: OrcamentoItem, valorDoc: number): ConsumoCalculo {
  const saldoAntes = item.valor_orcado - item.valor_consumido
  const saldoDepois = saldoAntes - valorDoc

  return {
    orcamento_item_id: item.id,
    valor_orcado: item.valor_orcado,
    valor_ja_consumido: item.valor_consumido,
    valor_saldo_antes: saldoAntes,
    valor_documento: valorDoc,
    valor_saldo_depois: Math.max(saldoDepois, 0),
    consumo_tipo:
      saldoDepois > 0.01 ? 'parcial' :
      saldoDepois >= -0.01 ? 'total' :
      'excede'  // gera alerta automático
  }
}
```

**Regras de consumo:**
- `parcial` → saldo positivo permanece como previsão futura no fluxo
- `total` → previsão é completamente consumida (pode ser excluída no Omie)
- `excede` → valor real ultrapassa o orçado → gera alerta de desvio automático + score de confiança cai

---

## Score de Confiança — Composição

| Componente | Peso | Critério |
|---|---|---|
| Extração de dados | 0.20 | Todos os campos extraídos? CNPJ válido? |
| Classificação departamento | 0.25 | Match exato com lista de departamentos? |
| Classificação categoria | 0.20 | Match exato com lista de categorias? |
| Match orçamento | 0.25 | Encontrou item orçamentário? Similarity score? |
| Saldo disponível | 0.10 | Saldo suficiente? Não excede? |

**Limiares configuráveis (via interface):**
- `>= 0.85` → proposta aparece como "alta confiança" (borda verde na fila)
- `0.60 - 0.84` → proposta normal (revisão recomendada)
- `< 0.60` → proposta como "baixa confiança" (borda vermelha, revisão obrigatória)
- `< 0.40` → rejeição automática + notificação

---

## Ações no Omie (pós-aprovação)

### Criar lançamento real
```typescript
// API Omie: IncluirContaPagar
const payload = {
  codigo_lancamento_integracao: `SFP-${classificacao.id}`,
  codigo_cliente_fornecedor: omie_fornecedor_id,
  data_vencimento: classificacao.data_vencimento_ext,
  valor_documento: classificacao.valor_extraido,
  codigo_categoria: classificacao.categoria_proposta,
  data_previsao: classificacao.data_vencimento_ext,
  id_conta_corrente: conta_corrente_id,
  observacao: `Classificado por IA (score: ${classificacao.score_confianca}). Doc: ${documento.nome_arquivo}`,
  departamento: classificacao.departamento_proposto
}
```

### Ajustar previsão correspondente
```typescript
// Localizar previsão no Omie pelo departamento + categoria + fornecedor "PREVISAO"
// Se consumo PARCIAL:
//   → AlterarContaPagar: reduzir valor da previsão pelo montante consumido
// Se consumo TOTAL:
//   → ExcluirContaPagar: remover a previsão

// Exemplo: previsão de R$ 320.000, real de R$ 300.000
// → Alterar previsão para R$ 20.000 (saldo remanescente)
// → O saldo de R$ 20.000 continua aparecendo no fluxo de caixa futuro
```

### Distribuição quando documento consome múltiplos itens

Se uma NF tem itens que pertencem a diferentes categorias orçamentárias:
1. IA separa por categoria
2. Cada parcela é tratada como uma proposta individual
3. Cada uma vincula ao seu item orçamentário
4. Todas aparecem na fila como grupo (mesmo `documento_id`)

---

## Aprendizado e Feedback Loop

A cada correção do auditor, o sistema registra:
- O que a IA propôs vs o que foi corrigido
- Esses dados alimentam futuras decisões (via exemplos no prompt)

```sql
-- Query para extrair histórico de correções como exemplos
SELECT
  ci.fornecedor_extraido,
  ci.departamento_proposto AS ia_disse,
  ci.correcoes->>'departamento_proposto'->>'para' AS correto,
  ci.itens_extraidos
FROM classificacoes_ia ci
WHERE ci.status_auditoria = 'corrigido'
  AND ci.company_id = $1
ORDER BY ci.auditado_em DESC
LIMIT 20;
```

Esses exemplos são injetados no prompt de classificação como few-shot learning:
```
EXEMPLOS DE CORREÇÕES ANTERIORES:
- Fornecedor "JM FERRAGENS" com "Tela Q-138": IA disse "GESTÃO LOCAL", correto é "RADIER" > "FERRAGEM"
- Fornecedor "CIGAME" com "Tubo PVC DN 40mm": IA disse "RADIER", correto é "ESPERAS DE ESGOTO RADIER" > "Tubos e conexoes"
```
