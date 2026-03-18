

# Pipeline de Classificação IA com Google Gemini

## O que será construído

Uma Edge Function `classify-document` que, ao receber um documento enviado pelo cliente, usa o Google Gemini (via Lovable AI Gateway) para extrair dados (fornecedor, CNPJ, valor, vencimento), classificar no orçamento correto e inserir na fila de auditoria automaticamente. O admin controla thresholds e auto-approve na aba "IA" de Settings (que já existe).

## Arquitetura

```text
Upload (DocumentUploadZone)
  → documentos.status = 'recebido'
  → Frontend invoca classify-document
    → Edge Function:
      1. Baixa arquivo do Storage (service_role)
      2. Busca contexto: orcamento_grupos + items + categoria_depara
      3. Busca companies.config (thresholds)
      4. Chama Lovable AI Gateway (google/gemini-2.5-flash) com tool calling
      5. Insere resultado em classificacoes_ia
      6. Se auto_approve + score >= threshold → aprova direto
      7. Atualiza documentos.status
  → Frontend invalida queries → Audit Queue atualiza
```

## Arquivos a criar/editar

### 1. `supabase/functions/classify-document/index.ts` (criar)
Edge Function principal:
- CORS headers padronizados
- `verify_jwt = false`, valida via `getClaims()`
- Recebe `{ documento_id }` no body
- Usa `SUPABASE_SERVICE_ROLE_KEY` para baixar arquivo do bucket privado `documentos`
- Busca `orcamento_grupos`, `orcamento_items` e `categoria_depara` da company como contexto
- Busca `companies.config` para thresholds
- Chama `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`, modelo `google/gemini-2.5-flash`
- Usa **tool calling** com schema estruturado:
  ```
  classify_document({
    fornecedor, cnpj, valor, data_vencimento,
    departamento_proposto, categoria_proposta,
    grupo_proposto, item_id, score_confianca, justificativa_ia
  })
  ```
- System prompt inclui lista de grupos/itens/categorias como referência
- Insere resultado em `classificacoes_ia` com campos de impacto orçamentário calculados
- Lógica de auto-approve: se `config.auto_approve_ativo === true` e `score >= config.score_minimo_auto_approve`, marca como aprovado
- Atualiza `documentos.status` para `classificado` ou `erro`
- Trata erros 429 (rate limit) e 402 (créditos) com mensagens claras retornadas ao frontend

### 2. `supabase/config.toml` (editar)
Adicionar:
```toml
[functions.classify-document]
verify_jwt = false
```

### 3. `src/hooks/useUploadDocument.ts` (editar)
Após upload e insert bem-sucedidos, chamar:
```typescript
supabase.functions.invoke('classify-document', {
  body: { documento_id: data.id }
})
```
Retornar status da classificação no `UploadResult`.

### 4. `src/components/client/DocumentUploadZone.tsx` (editar)
- Atualizar toast de sucesso para mostrar "Documento enviado — classificação iniciada"
- Invalidar queries de `audit-queue` e `audit-stats` no onSuccess
- Tratar erros de classificação (429/402) com toasts informativos

## Secrets necessários
Todos já configurados: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Sem alterações de banco
A tabela `classificacoes_ia` e `documentos` já têm todos os campos necessários. Nenhuma migration SQL é necessária.

