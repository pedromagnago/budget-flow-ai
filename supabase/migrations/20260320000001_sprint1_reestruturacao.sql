-- ================================================================
-- SPRINT 1 — Reestruturação do Modelo de Dados
-- ================================================================
-- 1. Tabela fornecedores (substituir texto livre)
-- 2. Vínculo forte etapa → orçamento → cronograma → financeiro
-- 3. View consolidada vw_etapa_completa
-- 4. Limpeza de config legado (Omie)
-- 5. Atualizar default da config de companies
-- ================================================================

-- ────────────────────────────────────────────────────────
-- 1. TABELA FORNECEDORES
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  cnpj            TEXT,
  email           TEXT,
  telefone        TEXT,
  categoria       TEXT,              -- material, mao_de_obra, servico, locacao
  observacoes     TEXT,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_fornecedores_company ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj) WHERE cnpj IS NOT NULL;

-- RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_access" ON public.fornecedores
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

-- Timestamp trigger
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────
-- 2. ADICIONAR fornecedor_id NAS TABELAS EXISTENTES
-- ────────────────────────────────────────────────────────

-- Em orcamento_items: vincular item a um fornecedor
ALTER TABLE public.orcamento_items
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id);

CREATE INDEX IF NOT EXISTS idx_orcamento_items_fornecedor ON public.orcamento_items(fornecedor_id) WHERE fornecedor_id IS NOT NULL;

-- Em lancamentos: vincular lançamento a um fornecedor normalizado
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id);

CREATE INDEX IF NOT EXISTS idx_lancamentos_fornecedor ON public.lancamentos(fornecedor_id) WHERE fornecedor_id IS NOT NULL;

-- Em movimentacoes_bancarias: vincular movimentação a fornecedor
ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id);

-- ────────────────────────────────────────────────────────
-- 3. FORTALECER VÍNCULO cronograma_servicos → orcamento_items
-- ────────────────────────────────────────────────────────

-- Cada serviço do cronograma pode estar vinculado a um item orçamentário específico
ALTER TABLE public.cronograma_servicos
  ADD COLUMN IF NOT EXISTS orcamento_item_id UUID REFERENCES public.orcamento_items(id);

CREATE INDEX IF NOT EXISTS idx_cronograma_item ON public.cronograma_servicos(orcamento_item_id) WHERE orcamento_item_id IS NOT NULL;

-- ────────────────────────────────────────────────────────
-- 4. TORNAR orcamento_item_id MAIS IMPORTANTE em lancamentos
-- ────────────────────────────────────────────────────────

-- Melhorar o index de lancamentos.orcamento_item_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_lancamentos_orcamento_item ON public.lancamentos(orcamento_item_id) WHERE orcamento_item_id IS NOT NULL;

-- Index composto para queries financeiras frequentes
CREATE INDEX IF NOT EXISTS idx_lancamentos_company_tipo_vencimento ON public.lancamentos(company_id, tipo, data_vencimento) WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────
-- 5. VIEW CONSOLIDADA: vw_etapa_completa
-- ────────────────────────────────────────────────────────
-- Cruza: etapa (grupo) → itens → serviços → financeiro
-- Para cada grupo orçamentário, mostra o panorama completo

CREATE OR REPLACE VIEW public.vw_etapa_completa AS
SELECT
  g.id                          AS grupo_id,
  g.company_id,
  g.nome                        AS etapa_nome,
  g.valor_total                 AS etapa_valor_orcado,

  -- Contagem e soma de itens
  COALESCE(item_agg.total_itens, 0)           AS total_itens,
  COALESCE(item_agg.soma_orcado_itens, 0)     AS soma_orcado_itens,
  COALESCE(item_agg.soma_consumido_itens, 0)  AS soma_consumido_itens,
  COALESCE(item_agg.soma_saldo_itens, 0)      AS soma_saldo_itens,

  -- Serviços do cronograma vinculados a este grupo
  COALESCE(serv_agg.total_servicos, 0)        AS total_servicos,
  COALESCE(serv_agg.servicos_concluidos, 0)   AS servicos_concluidos,
  COALESCE(serv_agg.servicos_atrasados, 0)    AS servicos_atrasados,

  -- Financeiro: lançamentos vinculados a itens deste grupo
  COALESCE(fin_agg.total_lancamentos, 0)      AS total_lancamentos,
  COALESCE(fin_agg.valor_total_lancamentos, 0) AS valor_total_lancamentos,
  COALESCE(fin_agg.valor_pago_lancamentos, 0) AS valor_pago_lancamentos,
  COALESCE(fin_agg.lancamentos_pendentes, 0)  AS lancamentos_pendentes,
  COALESCE(fin_agg.lancamentos_vencidos, 0)   AS lancamentos_vencidos,

  -- Fornecedores únicos neste grupo
  COALESCE(forn_agg.total_fornecedores, 0)    AS total_fornecedores,

  -- Percentuais calculados
  CASE
    WHEN g.valor_total > 0
    THEN ROUND((COALESCE(item_agg.soma_consumido_itens, 0) / g.valor_total * 100)::numeric, 1)
    ELSE 0
  END AS pct_consumido,

  CASE
    WHEN COALESCE(serv_agg.total_servicos, 0) > 0
    THEN ROUND((COALESCE(serv_agg.servicos_concluidos, 0)::numeric / serv_agg.total_servicos * 100), 1)
    ELSE 0
  END AS pct_fisico_concluido

FROM public.orcamento_grupos g

-- Agregação de itens orçamentários
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                           AS total_itens,
    COALESCE(SUM(i.valor_orcado), 0)   AS soma_orcado_itens,
    COALESCE(SUM(i.valor_consumido), 0) AS soma_consumido_itens,
    COALESCE(SUM(i.valor_saldo), 0)    AS soma_saldo_itens
  FROM public.orcamento_items i
  WHERE i.grupo_id = g.id
) item_agg ON true

-- Agregação de serviços do cronograma
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                                       AS total_servicos,
    COUNT(*) FILTER (WHERE s.status = 'concluido')                 AS servicos_concluidos,
    COUNT(*) FILTER (WHERE s.data_fim_plan < CURRENT_DATE AND s.status != 'concluido') AS servicos_atrasados
  FROM public.cronograma_servicos s
  WHERE s.grupo_id = g.id AND s.ativo = true
) serv_agg ON true

-- Agregação financeira (lançamentos vinculados a itens deste grupo)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                     AS total_lancamentos,
    COALESCE(SUM(ABS(l.valor)), 0)               AS valor_total_lancamentos,
    COALESCE(SUM(ABS(COALESCE(l.valor_pago, 0))), 0) AS valor_pago_lancamentos,
    COUNT(*) FILTER (WHERE l.data_pagamento IS NULL) AS lancamentos_pendentes,
    COUNT(*) FILTER (WHERE l.data_pagamento IS NULL AND l.data_vencimento < CURRENT_DATE) AS lancamentos_vencidos
  FROM public.lancamentos l
  INNER JOIN public.orcamento_items oi ON oi.id = l.orcamento_item_id
  WHERE oi.grupo_id = g.id AND l.deleted_at IS NULL
) fin_agg ON true

-- Fornecedores únicos
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT f.id) AS total_fornecedores
  FROM public.fornecedores f
  INNER JOIN public.orcamento_items oi ON oi.fornecedor_id = f.id
  WHERE oi.grupo_id = g.id
) forn_agg ON true

WHERE g.ativo = true;

-- Security invoker para RLS funcionar
ALTER VIEW public.vw_etapa_completa SET (security_invoker = true);

-- ────────────────────────────────────────────────────────
-- 6. VIEW: vw_fornecedor_resumo
-- ────────────────────────────────────────────────────────
-- Resumo por fornecedor: quanto representa no orçamento, pagamentos, etc.

CREATE OR REPLACE VIEW public.vw_fornecedor_resumo AS
SELECT
  f.id                            AS fornecedor_id,
  f.company_id,
  f.razao_social,
  f.nome_fantasia,
  f.cnpj,
  f.categoria,

  -- Itens orçamentários vinculados
  COALESCE(item_agg.total_itens, 0)           AS total_itens_orcamento,
  COALESCE(item_agg.valor_orcado, 0)          AS valor_total_orcado,

  -- Lançamentos vinculados
  COALESCE(lanc_agg.total_lancamentos, 0)     AS total_lancamentos,
  COALESCE(lanc_agg.valor_total, 0)           AS valor_total_lancamentos,
  COALESCE(lanc_agg.valor_pago, 0)            AS valor_total_pago,
  COALESCE(lanc_agg.pendentes, 0)             AS lancamentos_pendentes,
  COALESCE(lanc_agg.vencidos, 0)              AS lancamentos_vencidos

FROM public.fornecedores f

LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                          AS total_itens,
    COALESCE(SUM(oi.valor_orcado), 0) AS valor_orcado
  FROM public.orcamento_items oi
  WHERE oi.fornecedor_id = f.id
) item_agg ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                     AS total_lancamentos,
    COALESCE(SUM(ABS(l.valor)), 0)               AS valor_total,
    COALESCE(SUM(ABS(COALESCE(l.valor_pago, 0))), 0) AS valor_pago,
    COUNT(*) FILTER (WHERE l.data_pagamento IS NULL) AS pendentes,
    COUNT(*) FILTER (WHERE l.data_pagamento IS NULL AND l.data_vencimento < CURRENT_DATE) AS vencidos
  FROM public.lancamentos l
  WHERE l.fornecedor_id = f.id AND l.deleted_at IS NULL
) lanc_agg ON true

WHERE f.ativo = true;

ALTER VIEW public.vw_fornecedor_resumo SET (security_invoker = true);

-- ────────────────────────────────────────────────────────
-- 7. LIMPAR CONFIG LEGADO (Omie)
-- ────────────────────────────────────────────────────────

-- Remover chave dias_sync_omie do JSON config (onde existir)
UPDATE public.companies
SET config = config - 'dias_sync_omie'
WHERE config ? 'dias_sync_omie';

-- Atualizar default do config para novos projetos
ALTER TABLE public.companies
ALTER COLUMN config SET DEFAULT '{
  "limiar_desvio_alerta": 0.10,
  "score_minimo_auto_approve": 0.95,
  "prazo_padrao_medicao_dias": 15,
  "quinzena_atual": "Q1"
}'::jsonb;

-- ────────────────────────────────────────────────────────
-- 8. GRANT/REVOKE para novas views
-- ────────────────────────────────────────────────────────

GRANT SELECT ON public.vw_etapa_completa TO authenticated;
GRANT SELECT ON public.vw_fornecedor_resumo TO authenticated;
GRANT ALL ON public.fornecedores TO authenticated;
