
-- ================================================
-- Core tables: companies + user_roles + security
-- ================================================

CREATE TABLE public.companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  cnpj            TEXT UNIQUE,
  municipio       TEXT,
  estado          TEXT,
  qtd_casas       INTEGER,
  status          TEXT DEFAULT 'ativo',
  config          JSONB DEFAULT '{"limiar_desvio_alerta": 0.10, "score_minimo_auto_approve": 0.95, "dias_sync_omie": 1, "quinzena_atual": "Q1"}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Security definer function
CREATE OR REPLACE FUNCTION public.user_can_access_company(uid UUID, cid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND company_id = cid AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function for auth hook
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TABLE(role TEXT, company_id UUID) AS $$
  SELECT ur.role, ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id AND ur.active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_access" ON public.companies
  FOR ALL USING (public.user_can_access_company(auth.uid(), id));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.user_can_access_company(auth.uid(), company_id));
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT WITH CHECK (true);
