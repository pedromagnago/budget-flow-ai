-- ═══════════════════════════════════════════════════════════════
-- Sprint 3: Operacionalização Financeira
-- ═══════════════════════════════════════════════════════════════
-- 1. Workflow de aprovação em lancamentos
-- 2. View pipeline financeiro (Kanban)
-- 3. Índices adicionais para performance
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colunas de aprovação no lancamentos ──

ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS status_aprovacao TEXT DEFAULT 'pendente'
    CHECK (status_aprovacao IN ('pendente','aprovado','rejeitado')),
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── 2. View pipeline financeiro ──
-- Agrupa os lançamentos em "raias" por fase do fluxo operacional

CREATE OR REPLACE VIEW public.vw_pipeline_financeiro AS
WITH base AS (
  SELECT
    l.id,
    l.company_id,
    l.tipo,
    l.valor,
    l.valor_pago,
    l.fornecedor_razao,
    l.fornecedor_id,
    l.departamento,
    COALESCE(TRIM(regexp_replace(l.departamento, '^[\d\.\s]+', '')), l.departamento) AS departamento_limpo,
    l.categoria,
    l.data_vencimento,
    l.data_pagamento,
    l.e_previsao,
    l.conciliado,
    l.status_aprovacao,
    l.aprovado_por,
    l.orcamento_item_id,
    l.forma_pagamento,
    l.numero_parcela,
    l.total_parcelas,
    l.observacao,
    l.created_at,
    -- Fase calculada
    CASE
      WHEN l.deleted_at IS NOT NULL THEN 'cancelado'
      WHEN l.e_previsao = true THEN 'previsao'
      WHEN l.status_aprovacao = 'rejeitado' THEN 'rejeitado'
      WHEN l.status_aprovacao = 'pendente' AND l.e_previsao = false THEN 'aguardando_aprovacao'
      WHEN l.conciliado = true OR l.data_pagamento IS NOT NULL THEN 'pago'
      WHEN l.data_vencimento < CURRENT_DATE THEN 'atrasado'
      WHEN l.data_vencimento <= CURRENT_DATE + INTERVAL '3 days' THEN 'vence_em_breve'
      WHEN l.status_aprovacao = 'aprovado' THEN 'a_pagar'
      ELSE 'a_pagar'
    END AS fase,
    -- Dias até vencimento
    CASE
      WHEN l.data_vencimento IS NOT NULL THEN l.data_vencimento - CURRENT_DATE
      ELSE NULL
    END AS dias_ate_vencimento,
    -- Info orçamentária
    oi.item AS orcamento_item_nome,
    oi.valor_orcado AS orcamento_valor_orcado,
    oi.valor_consumido AS orcamento_valor_consumido,
    og.nome AS etapa_nome
  FROM public.lancamentos l
  LEFT JOIN public.orcamento_items oi ON oi.id = l.orcamento_item_id
  LEFT JOIN public.orcamento_grupos og ON og.id = oi.grupo_id
  WHERE l.deleted_at IS NULL
)
SELECT * FROM base;

-- ── 3. View resumo pipeline (contadores por fase) ──

CREATE OR REPLACE VIEW public.vw_pipeline_resumo AS
SELECT
  company_id,
  tipo,
  fase,
  COUNT(*)::int AS total_lancamentos,
  COALESCE(SUM(ABS(valor)), 0) AS valor_total,
  COALESCE(SUM(ABS(valor_pago)), 0) AS valor_pago_total
FROM public.vw_pipeline_financeiro
GROUP BY company_id, tipo, fase;

-- ── 4. Índices para performance ──

CREATE INDEX IF NOT EXISTS idx_lancamentos_status_aprovacao
  ON public.lancamentos(status_aprovacao)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_e_previsao
  ON public.lancamentos(e_previsao)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento_status
  ON public.lancamentos(data_vencimento, status_aprovacao)
  WHERE deleted_at IS NULL AND conciliado = false;

-- ── 5. Atualizar vw_lancamentos_status para incluir aprovação ──

CREATE OR REPLACE VIEW public.vw_lancamentos_status AS
SELECT
  l.id,
  l.company_id,
  l.tipo,
  l.valor,
  l.valor_pago,
  l.fornecedor_razao,
  l.fornecedor_cnpj,
  l.fornecedor_id,
  l.departamento,
  COALESCE(TRIM(regexp_replace(l.departamento, '^[\d\.\s]+', '')), l.departamento) AS departamento_limpo,
  l.categoria,
  l.observacao,
  l.parcela,
  l.numero_parcela,
  l.total_parcelas,
  l.data_vencimento,
  l.data_emissao,
  l.data_pagamento,
  l.forma_pagamento,
  l.e_previsao,
  l.conciliado,
  l.situacao,
  l.quinzena,
  l.orcamento_item_id,
  l.conta_bancaria_id,
  l.movimentacao_id,
  l.status_aprovacao,
  l.aprovado_por,
  l.aprovado_em,
  l.motivo_rejeicao,
  -- Status calculado
  CASE
    WHEN l.e_previsao = true THEN 'previsto'
    WHEN l.conciliado = true OR l.data_pagamento IS NOT NULL THEN 'pago'
    WHEN l.data_vencimento IS NULL THEN 'pendente'
    WHEN l.data_vencimento < CURRENT_DATE THEN 'atrasado'
    WHEN l.data_vencimento <= CURRENT_DATE + INTERVAL '3 days' THEN 'vence_em_breve'
    ELSE 'pendente'
  END AS status_calculado,
  CASE
    WHEN l.data_vencimento IS NOT NULL THEN l.data_vencimento - CURRENT_DATE
    ELSE NULL
  END AS dias_ate_vencimento,
  l.created_at
FROM public.lancamentos l
WHERE l.deleted_at IS NULL;

-- ── 6. RLS na pipeline view (security invoker) ──
ALTER VIEW public.vw_pipeline_financeiro SET (security_invoker = true);
ALTER VIEW public.vw_pipeline_resumo SET (security_invoker = true);
