
-- ================================================
-- Schedule + Simulator tables
-- ================================================

CREATE TABLE public.cronograma_servicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  nome            TEXT NOT NULL,
  preco_unitario  NUMERIC(15,2),
  quantidade      INTEGER DEFAULT 64,
  valor_total     NUMERIC(15,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.medicoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  numero          INTEGER NOT NULL,
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  valor_planejado NUMERIC(15,2) NOT NULL,
  status          TEXT DEFAULT 'futura',
  valor_liberado  NUMERIC(15,2) DEFAULT 0,
  data_liberacao  DATE,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, numero)
);

CREATE TABLE public.medicoes_metas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  servico_id      UUID NOT NULL REFERENCES public.cronograma_servicos(id),
  medicao_numero  INTEGER NOT NULL,
  meta_percentual NUMERIC(5,4) NOT NULL,
  meta_casas      INTEGER,
  valor_liberado  NUMERIC(15,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, servico_id, medicao_numero)
);

CREATE TABLE public.avanco_fisico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  servico_id      UUID NOT NULL REFERENCES public.cronograma_servicos(id),
  data_registro   DATE NOT NULL DEFAULT CURRENT_DATE,
  casas_concluidas INTEGER NOT NULL DEFAULT 0,
  percentual_real NUMERIC(5,4) GENERATED ALWAYS AS (casas_concluidas::NUMERIC / 64) STORED,
  registrado_por  UUID REFERENCES auth.users(id),
  observacoes     TEXT,
  fotos           TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, servico_id, data_registro)
);

CREATE TABLE public.cenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  tipo            TEXT DEFAULT 'custom',
  ativo           BOOLEAN DEFAULT true,
  criado_por      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cenario_ajustes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  cenario_id      UUID NOT NULL REFERENCES public.cenarios(id),
  tipo_ajuste     TEXT NOT NULL,
  referencia_tipo TEXT,
  referencia_id   UUID,
  campo_alterado  TEXT,
  valor_original  TEXT,
  valor_novo      TEXT,
  parcelas        JSONB,
  justificativa   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for all
ALTER TABLE public.cronograma_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronograma_servicos_access" ON public.cronograma_servicos
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicoes_access" ON public.medicoes
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.medicoes_metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicoes_metas_access" ON public.medicoes_metas
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.avanco_fisico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avanco_fisico_access" ON public.avanco_fisico
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.cenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cenarios_access" ON public.cenarios
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.cenario_ajustes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cenario_ajustes_access" ON public.cenario_ajustes
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));
