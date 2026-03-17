
-- ================================================
-- Operational tables: omie_lancamentos, documentos, classificacoes_ia, alertas, audit_logs
-- ================================================

CREATE TABLE public.omie_lancamentos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id),
  omie_id               BIGINT,
  omie_integracao_id    TEXT,
  tipo                  TEXT NOT NULL,
  fornecedor_razao      TEXT,
  fornecedor_cnpj       TEXT,
  valor                 NUMERIC(15,2) NOT NULL,
  valor_pago            NUMERIC(15,2) DEFAULT 0,
  data_vencimento       DATE,
  data_emissao          DATE,
  data_pagamento        DATE,
  departamento          TEXT,
  departamento_limpo    TEXT GENERATED ALWAYS AS (TRIM(regexp_replace(departamento, '^[\d\.\s]+', ''))) STORED,
  categoria             TEXT,
  grupo_omie            TEXT,
  situacao              TEXT,
  conta_corrente        TEXT,
  observacao            TEXT,
  parcela               TEXT,
  conciliado            BOOLEAN DEFAULT false,
  e_previsao            BOOLEAN DEFAULT false,
  origem                TEXT,
  orcamento_item_id     UUID REFERENCES public.orcamento_items(id),
  deleted_at            TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, omie_id)
);

CREATE TABLE public.documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  nome_arquivo    TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  tamanho_bytes   BIGINT,
  tipo_mime       TEXT,
  enviado_por     UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'recebido',
  erro_detalhe    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.classificacoes_ia (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id),
  documento_id          UUID NOT NULL REFERENCES public.documentos(id),
  fornecedor_extraido   TEXT,
  cnpj_extraido         TEXT,
  valor_extraido        NUMERIC(15,2),
  data_vencimento_ext   DATE,
  itens_extraidos       JSONB,
  departamento_proposto TEXT,
  categoria_proposta    TEXT,
  grupo_proposto        TEXT,
  orcamento_item_id     UUID REFERENCES public.orcamento_items(id),
  valor_orcado_item     NUMERIC(15,2),
  valor_ja_consumido    NUMERIC(15,2),
  valor_saldo_antes     NUMERIC(15,2),
  valor_saldo_depois    NUMERIC(15,2),
  score_confianca       NUMERIC(4,3),
  justificativa_ia      TEXT,
  status_auditoria      TEXT DEFAULT 'pendente',
  auditado_por          UUID REFERENCES auth.users(id),
  auditado_em           TIMESTAMPTZ,
  correcoes             JSONB,
  motivo_rejeicao       TEXT,
  omie_lancamento_id    UUID REFERENCES public.omie_lancamentos(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id),
  tipo            TEXT NOT NULL,
  severidade      TEXT DEFAULT 'media',
  titulo          TEXT NOT NULL,
  mensagem        TEXT,
  dados           JSONB,
  lido            BOOLEAN DEFAULT false,
  lido_por        UUID REFERENCES auth.users(id),
  lido_em         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id),
  user_id     UUID REFERENCES auth.users(id),
  agente      TEXT DEFAULT 'humano',
  tabela      TEXT NOT NULL,
  registro_id UUID,
  acao        TEXT NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for all operational tables
ALTER TABLE public.omie_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "omie_lancamentos_access" ON public.omie_lancamentos
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_access" ON public.documentos
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.classificacoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classificacoes_ia_access" ON public.classificacoes_ia
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_access" ON public.alertas
  FOR ALL USING (public.user_can_access_company(auth.uid(), company_id));

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin','supervisor')
      AND active = true
    )
  );
