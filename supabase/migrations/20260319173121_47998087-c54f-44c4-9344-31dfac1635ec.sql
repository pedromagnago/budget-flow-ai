
-- Migration: replace_omie_with_native_financial

-- 1.1 Rename omie_lancamentos → lancamentos
ALTER TABLE public.omie_lancamentos RENAME TO lancamentos;

-- Drop Omie-specific columns
ALTER TABLE public.lancamentos
  DROP COLUMN IF EXISTS omie_id,
  DROP COLUMN IF EXISTS omie_integracao_id,
  DROP COLUMN IF EXISTS grupo_omie,
  DROP COLUMN IF EXISTS conta_corrente,
  DROP COLUMN IF EXISTS origem,
  DROP COLUMN IF EXISTS synced_at;

-- Drop generated column before re-creating
ALTER TABLE public.lancamentos DROP COLUMN IF EXISTS departamento_limpo;

-- Rename columns in categoria_depara
ALTER TABLE public.categoria_depara
  RENAME COLUMN departamento_omie TO departamento;

ALTER TABLE public.categoria_depara
  RENAME COLUMN apropriacao_excel TO apropriacao;

ALTER TABLE public.categoria_depara
  DROP COLUMN IF EXISTS categoria_omie;

-- Rename FK on classificacoes_ia
ALTER TABLE public.classificacoes_ia
  RENAME COLUMN omie_lancamento_id TO lancamento_id;

-- 1.2 Create banking tables
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id),
  nome                TEXT NOT NULL,
  banco               TEXT NOT NULL,
  agencia             TEXT,
  conta               TEXT,
  tipo                TEXT NOT NULL CHECK (tipo IN ('corrente','poupanca','caixa','cartao_credito','investimento')),
  saldo_inicial       NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_saldo_inicial  DATE NOT NULL,
  ativo               BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to lancamentos (after contas_bancarias exists)
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS quinzena TEXT,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS numero_parcela INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_parcelas INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  ADD COLUMN IF NOT EXISTS movimentacao_id UUID,
  ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Re-create departamento_limpo as generated column
ALTER TABLE public.lancamentos
  ADD COLUMN departamento_limpo TEXT GENERATED ALWAYS AS (
    TRIM(regexp_replace(departamento, '^[\d\.\s]+', ''))
  ) STORED;

CREATE TABLE IF NOT EXISTS public.movimentacoes_bancarias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id),
  conta_id            UUID NOT NULL REFERENCES public.contas_bancarias(id),
  data                DATE NOT NULL,
  descricao           TEXT NOT NULL,
  valor               NUMERIC(15,2) NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('entrada','saida','transferencia_entrada','transferencia_saida','ajuste')),
  categoria           TEXT,
  grupo_id            UUID REFERENCES public.orcamento_grupos(id),
  item_id             UUID REFERENCES public.orcamento_items(id),
  lancamento_id       UUID REFERENCES public.lancamentos(id),
  fornecedor          TEXT,
  documento           TEXT,
  conciliado          BOOLEAN DEFAULT false,
  conciliado_em       TIMESTAMPTZ,
  conciliado_por      UUID REFERENCES auth.users(id),
  transferencia_id    UUID,
  observacao          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ajustes_saldo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id),
  conta_id            UUID NOT NULL REFERENCES public.contas_bancarias(id),
  data                DATE NOT NULL,
  saldo_anterior      NUMERIC(15,2) NOT NULL,
  saldo_correto       NUMERIC(15,2) NOT NULL,
  diferenca           NUMERIC(15,2) GENERATED ALWAYS AS (saldo_correto - saldo_anterior) STORED,
  motivo              TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id),
  user_id             UUID REFERENCES auth.users(id),
  tipo                TEXT NOT NULL CHECK (tipo IN (
    'vencimento_hoje','vencimento_amanha','vencimento_semana',
    'pagamento_atrasado','recebimento_previsto','desvio_orcamento',
    'atraso_cronograma','conciliacao_pendente','sistema'
  )),
  titulo              TEXT NOT NULL,
  mensagem            TEXT NOT NULL,
  lancamento_id       UUID REFERENCES public.lancamentos(id),
  lida                BOOLEAN DEFAULT false,
  lida_em             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Views
CREATE OR REPLACE VIEW public.vw_saldo_contas AS
SELECT
  cb.id,
  cb.company_id,
  cb.nome,
  cb.banco,
  cb.tipo,
  cb.saldo_inicial,
  cb.data_saldo_inicial,
  cb.ativo,
  COALESCE(SUM(m.valor), 0) AS movimentacoes_total,
  cb.saldo_inicial + COALESCE(SUM(m.valor), 0) AS saldo_atual,
  COUNT(m.id) FILTER (WHERE NOT m.conciliado) AS pendentes_conciliacao
FROM public.contas_bancarias cb
LEFT JOIN public.movimentacoes_bancarias m ON m.conta_id = cb.id
GROUP BY cb.id, cb.company_id, cb.nome, cb.banco, cb.tipo,
         cb.saldo_inicial, cb.data_saldo_inicial, cb.ativo;

CREATE OR REPLACE VIEW public.vw_lancamentos_status AS
SELECT
  l.*,
  CASE
    WHEN l.e_previsao = true THEN 'previsto'
    WHEN l.data_pagamento IS NOT NULL OR l.valor_pago >= ABS(l.valor) THEN 'pago'
    WHEN l.data_vencimento < CURRENT_DATE THEN 'atrasado'
    WHEN l.data_vencimento <= CURRENT_DATE + 7 THEN 'vence_em_breve'
    ELSE 'pendente'
  END AS status_calculado,
  l.data_vencimento - CURRENT_DATE AS dias_ate_vencimento
FROM public.lancamentos l
WHERE l.deleted_at IS NULL;

-- 1.4 RLS
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_saldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contas_bancarias_access" ON public.contas_bancarias
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

CREATE POLICY "movimentacoes_bancarias_access" ON public.movimentacoes_bancarias
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

CREATE POLICY "ajustes_saldo_access" ON public.ajustes_saldo
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

CREATE POLICY "notificacoes_access" ON public.notificacoes
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

-- Update RLS policy on lancamentos (was omie_lancamentos)
DROP POLICY IF EXISTS "omie_lancamentos_access" ON public.lancamentos;
CREATE POLICY "lancamentos_access" ON public.lancamentos
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

-- Update FK name on classificacoes_ia
ALTER TABLE public.classificacoes_ia
  DROP CONSTRAINT IF EXISTS classificacoes_ia_omie_lancamento_id_fkey;

ALTER TABLE public.classificacoes_ia
  ADD CONSTRAINT classificacoes_ia_lancamento_id_fkey
  FOREIGN KEY (lancamento_id) REFERENCES public.lancamentos(id);

-- Rename FK constraints on lancamentos
ALTER TABLE public.lancamentos
  DROP CONSTRAINT IF EXISTS omie_lancamentos_company_id_fkey;
ALTER TABLE public.lancamentos
  ADD CONSTRAINT lancamentos_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.lancamentos
  DROP CONSTRAINT IF EXISTS omie_lancamentos_orcamento_item_id_fkey;
ALTER TABLE public.lancamentos
  ADD CONSTRAINT lancamentos_orcamento_item_id_fkey
  FOREIGN KEY (orcamento_item_id) REFERENCES public.orcamento_items(id);

-- Update the trigger function that references omie_lancamentos
CREATE OR REPLACE FUNCTION public.update_consumido_on_link()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.orcamento_item_id IS NOT NULL AND NEW.e_previsao = false THEN
    UPDATE public.orcamento_items
    SET valor_consumido = valor_consumido + ABS(NEW.valor),
        updated_at = NOW()
    WHERE id = NEW.orcamento_item_id;
  END IF;
  RETURN NEW;
END;
$function$;
