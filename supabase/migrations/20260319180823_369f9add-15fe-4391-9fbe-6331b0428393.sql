
-- Enrich tables
ALTER TABLE public.cronograma_servicos
  ADD COLUMN IF NOT EXISTS descricao   TEXT,
  ADD COLUMN IF NOT EXISTS depende_de  UUID REFERENCES public.cronograma_servicos(id),
  ADD COLUMN IF NOT EXISTS observacao  TEXT,
  ADD COLUMN IF NOT EXISTS ativo       BOOLEAN DEFAULT true;

ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS percentual_fisico_meta NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS percentual_fisico_real NUMERIC(5,2);

ALTER TABLE public.medicoes_metas
  ADD COLUMN IF NOT EXISTS valor_previsto   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS percentual_real  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS casas_concluidas INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_registro    DATE,
  ADD COLUMN IF NOT EXISTS registrado_por   UUID,
  ADD COLUMN IF NOT EXISTS observacao       TEXT;

CREATE TABLE IF NOT EXISTS public.avancos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  servico_id UUID NOT NULL REFERENCES public.cronograma_servicos(id),
  medicao_numero INTEGER NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  casas_concluidas INTEGER NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL,
  responsavel TEXT,
  observacao TEXT,
  foto_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE public.impactos_fisico_financeiro
  ADD COLUMN IF NOT EXISTS medicao_numero INTEGER,
  ADD COLUMN IF NOT EXISTS lancamento_id  UUID REFERENCES public.lancamentos(id),
  ADD COLUMN IF NOT EXISTS valor_impacto  NUMERIC(15,2);

-- Drop and recreate views
DROP VIEW IF EXISTS public.vw_servicos_situacao CASCADE;
DROP VIEW IF EXISTS public.vw_medicoes_financeiro CASCADE;

CREATE VIEW public.vw_servicos_situacao AS
SELECT
  s.id, s.company_id, s.nome, s.codigo, s.unidade, s.quantidade,
  s.preco_unitario, s.valor_total, s.responsavel,
  s.data_inicio_plan, s.data_fim_plan, s.data_inicio_real, s.data_fim_real,
  s.ordem, s.grupo_id, s.status, s.created_at,
  CASE
    WHEN s.data_fim_real IS NOT NULL THEN 'concluido'
    WHEN s.data_fim_plan < CURRENT_DATE AND s.data_fim_real IS NULL THEN 'atrasado'
    WHEN s.data_inicio_plan <= CURRENT_DATE AND s.data_fim_plan >= CURRENT_DATE THEN 'em_andamento'
    WHEN s.data_inicio_plan > CURRENT_DATE THEN 'futuro'
    ELSE 'nao_iniciado'
  END AS situacao_calculada,
  CASE
    WHEN s.data_fim_real IS NOT NULL THEN s.data_fim_real - s.data_fim_plan
    WHEN CURRENT_DATE > s.data_fim_plan THEN CURRENT_DATE - s.data_fim_plan
    ELSE 0
  END AS dias_atraso
FROM public.cronograma_servicos s
WHERE s.ativo IS NOT false;

CREATE VIEW public.vw_medicoes_financeiro AS
SELECT
  m.id, m.company_id, m.numero, m.data_inicio, m.data_fim,
  m.data_liberacao, m.previsao_liberacao, m.data_real_liberacao,
  m.valor_planejado, m.valor_liberado, m.status, m.observacoes,
  m.lancamento_receita_id, m.created_at, m.updated_at,
  CASE
    WHEN m.data_real_liberacao IS NOT NULL AND m.valor_liberado > 0 THEN 'recebido'
    WHEN m.status = 'liberada' THEN 'liberado_aguardando'
    WHEN m.previsao_liberacao < CURRENT_DATE AND m.status != 'liberada' THEN 'atrasado'
    WHEN m.status = 'em_andamento' THEN 'em_andamento'
    ELSE 'futuro'
  END AS status_financeiro
FROM public.medicoes m;

-- RLS
ALTER TABLE public.avancos_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avancos_obra_access" ON public.avancos_obra
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));
