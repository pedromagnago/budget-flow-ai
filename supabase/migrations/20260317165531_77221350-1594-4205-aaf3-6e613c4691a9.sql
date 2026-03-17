
-- ================================================
-- Budget tables: orcamento_grupos, orcamento_items, categoria_depara
-- ================================================

CREATE TABLE public.orcamento_grupos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  nome            TEXT NOT NULL,
  valor_total     NUMERIC(15,2) NOT NULL,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, nome)
);

CREATE TABLE public.orcamento_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id),
  grupo_id          UUID NOT NULL REFERENCES public.orcamento_grupos(id),
  apropriacao       TEXT NOT NULL,
  tipo              TEXT,
  item              TEXT NOT NULL,
  unidade           TEXT,
  quantidade_total  NUMERIC(12,4),
  quantidade_unit   NUMERIC(12,4),
  custo_unitario    NUMERIC(12,4),
  custo_casa        NUMERIC(12,4),
  valor_orcado      NUMERIC(15,2) NOT NULL,
  valor_consumido   NUMERIC(15,2) DEFAULT 0,
  valor_saldo       NUMERIC(15,2) GENERATED ALWAYS AS (valor_orcado - valor_consumido) STORED,
  quinzenas         JSONB,
  linha_origem      INTEGER,
  ativo             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.categoria_depara (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id),
  apropriacao_excel   TEXT NOT NULL,
  departamento_omie   TEXT NOT NULL,
  tipo_excel          TEXT,
  categoria_omie      TEXT,
  match_automatico    BOOLEAN DEFAULT true,
  ativo               BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, apropriacao_excel, tipo_excel)
);

-- RLS
ALTER TABLE public.orcamento_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orcamento_grupos_access" ON public.orcamento_grupos
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.orcamento_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orcamento_items_access" ON public.orcamento_items
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.categoria_depara ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categoria_depara_access" ON public.categoria_depara
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));
