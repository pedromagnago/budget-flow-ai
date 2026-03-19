
-- Add planning columns to cronograma_servicos
ALTER TABLE public.cronograma_servicos
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.orcamento_grupos(id),
  ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS data_inicio_plan DATE,
  ADD COLUMN IF NOT EXISTS data_fim_plan DATE,
  ADD COLUMN IF NOT EXISTS data_inicio_real DATE,
  ADD COLUMN IF NOT EXISTS data_fim_real DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'futuro',
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- Add columns to medicoes
ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS data_real_liberacao DATE,
  ADD COLUMN IF NOT EXISTS lancamento_receita_id UUID REFERENCES public.lancamentos(id),
  ADD COLUMN IF NOT EXISTS previsao_liberacao DATE;

-- Create impactos_fisico_financeiro table
CREATE TABLE IF NOT EXISTS public.impactos_fisico_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  tipo TEXT NOT NULL,
  servico_id UUID REFERENCES public.cronograma_servicos(id),
  medicao_id UUID REFERENCES public.medicoes(id),
  descricao TEXT,
  desvio_dias INTEGER,
  desvio_percentual NUMERIC(8,2),
  impacto_financeiro NUMERIC(15,2),
  acao_tomada TEXT DEFAULT 'pendente',
  resolvido BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for impactos
ALTER TABLE public.impactos_fisico_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impactos_access" ON public.impactos_fisico_financeiro
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

-- View: servicos com situacao calculada
CREATE OR REPLACE VIEW public.vw_servicos_situacao AS
SELECT
  cs.*,
  CASE
    WHEN cs.data_fim_plan IS NULL THEN 'futuro'
    WHEN cs.data_fim_real IS NOT NULL THEN 'concluido'
    WHEN cs.data_fim_plan < CURRENT_DATE AND cs.data_fim_real IS NULL THEN 'atrasado'
    WHEN cs.data_inicio_real IS NOT NULL THEN 'em_andamento'
    ELSE 'futuro'
  END AS situacao_calculada,
  CASE
    WHEN cs.data_fim_plan IS NOT NULL AND cs.data_fim_real IS NULL AND cs.data_fim_plan < CURRENT_DATE
    THEN CURRENT_DATE - cs.data_fim_plan
    ELSE 0
  END AS dias_atraso
FROM public.cronograma_servicos cs;

-- View: medicoes com status financeiro
CREATE OR REPLACE VIEW public.vw_medicoes_financeiro AS
SELECT
  m.*,
  CASE
    WHEN m.status = 'futura' THEN 'futuro'
    WHEN m.data_real_liberacao IS NOT NULL AND m.valor_liberado >= m.valor_planejado THEN 'recebido'
    WHEN m.data_real_liberacao IS NOT NULL THEN 'liberado_aguardando'
    WHEN m.status = 'em_andamento' AND m.data_fim < CURRENT_DATE THEN 'atrasado'
    WHEN m.status = 'em_andamento' THEN 'em_andamento'
    WHEN m.status = 'liberada' THEN 'liberado_aguardando'
    ELSE 'futuro'
  END AS status_financeiro
FROM public.medicoes m;
