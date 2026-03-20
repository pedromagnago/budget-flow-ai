# Projeto SFP — Schema do Banco de Dados (Supabase/PostgreSQL)

## Princípios do Schema

1. **Toda tabela tem `company_id`** — isolamento multi-tenant
2. **RLS ativo em 100%** das tabelas
3. **Soft delete** — `deleted_at` em tabelas financeiras
4. **Audit log automático** — triggers em tabelas de dados
5. **Orçado = Consumido + Saldo** — constraint lógica central
6. **Omie é destino final** — `omie_id` rastreia o vínculo

---

## Função de Segurança (Base)

```sql
CREATE OR REPLACE FUNCTION user_can_access_company(uid UUID, cid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND company_id = cid AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Tabelas

### `companies` — Projetos/Tenants
```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  cnpj            TEXT UNIQUE,
  municipio       TEXT,
  estado          TEXT,
  qtd_casas       INTEGER,
  status          TEXT DEFAULT 'ativo'
                  CHECK (status IN ('ativo','suspenso','concluido','arquivado')),
  config          JSONB DEFAULT '{}'::jsonb,
  -- config inclui:
  --   omie_app_key (via Vault)
  --   omie_app_secret (via Vault)
  --   limiar_desvio_alerta: 0.10 (10% default)
  --   score_minimo_auto_approve: 0.95
  --   dias_sync_omie: 1
  --   quinzena_atual: "Q1"
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `user_roles` — Permissões
```sql
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
              CHECK (role IN ('super_admin','supervisor','operador','cliente')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);
```

---

### `orcamento_grupos` — Grupos orçamentários (nível macro)
```sql
CREATE TABLE orcamento_grupos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  nome            TEXT NOT NULL,              -- ex: "RADIER - 44,38 M²"
  valor_total     NUMERIC(15,2) NOT NULL,     -- orçamento original total do grupo
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, nome)
);
```

---

### `orcamento_items` — Itens detalhados do orçamento
```sql
CREATE TABLE orcamento_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  grupo_id          UUID NOT NULL REFERENCES orcamento_grupos(id),
  apropriacao       TEXT NOT NULL,            -- ex: "RADIER", "PAREDES COM CONCRETO"
  tipo              TEXT,                     -- ex: "MAO DE OBRA", "Tubos e conexoes"
  item              TEXT NOT NULL,            -- ex: "Mao de obra Terceirizada Radier"
  unidade           TEXT,                     -- ex: "vb", "m", "unidade", "pç"
  quantidade_total  NUMERIC(12,4),            -- quantidade para 64 casas
  quantidade_unit   NUMERIC(12,4),            -- quantidade por casa
  custo_unitario    NUMERIC(12,4),            -- preço unitário
  custo_casa        NUMERIC(12,4),            -- custo por casa
  valor_orcado      NUMERIC(15,2) NOT NULL,   -- valor total orçado (custo_total)
  valor_consumido   NUMERIC(15,2) DEFAULT 0,  -- acumulado de lançamentos reais
  valor_saldo       NUMERIC(15,2),            -- GENERATED: valor_orcado - valor_consumido
  quinzenas         JSONB,                    -- distribuição % por quinzena: {"Q1": 0.3, "Q2": 0.0, "Q3": 0.2333, ...}
  linha_origem      INTEGER,                  -- referência à linha no Excel original
  ativo             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT saldo_nao_negativo CHECK (valor_orcado - valor_consumido >= -0.01)
);

-- Coluna gerada para saldo
ALTER TABLE orcamento_items
  ADD COLUMN valor_saldo NUMERIC(15,2)
  GENERATED ALWAYS AS (valor_orcado - valor_consumido) STORED;
```

**Regra central:** `valor_saldo = valor_orcado - valor_consumido`. Quando a IA cria um lançamento real, `valor_consumido` aumenta e `valor_saldo` diminui automaticamente.

---

### `categoria_depara` — Mapeamento Excel ↔ Omie
```sql
CREATE TABLE categoria_depara (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  apropriacao_excel   TEXT NOT NULL,       -- nome no Excel (ex: "ELETRICA EFIAÇÃO + TOMADAS")
  departamento_omie   TEXT NOT NULL,       -- nome no Omie (ex: "3.18 ELETRICA EFIAÇÃO + TOMADAS")
  tipo_excel          TEXT,                -- tipo no Excel (ex: "MAO DE OBRA")
  categoria_omie      TEXT,                -- categoria no Omie (ex: "MAO DE OBRA")
  match_automatico    BOOLEAN DEFAULT true,-- se foi match automático ou manual
  ativo               BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, apropriacao_excel, tipo_excel)
);
```

**Carga inicial automática:** 29 registros com `match_automatico = true`.  
**Mapeamentos manuais:** 6-7 registros adicionais configuráveis via interface.

---

### `omie_lancamentos` — Espelho do Omie (sync diário)
```sql
CREATE TABLE omie_lancamentos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id),
  omie_id               BIGINT,                 -- codigo_lancamento_omie
  omie_integracao_id    TEXT,                    -- codigo_lancamento_integracao
  tipo                  TEXT NOT NULL CHECK (tipo IN ('pagar','receber')),
  fornecedor_razao      TEXT,
  fornecedor_cnpj       TEXT,
  valor                 NUMERIC(15,2) NOT NULL,
  valor_pago            NUMERIC(15,2) DEFAULT 0,
  data_vencimento       DATE,
  data_emissao          DATE,
  data_pagamento        DATE,
  departamento          TEXT,                    -- departamento Omie com prefixo
  departamento_limpo    TEXT,                    -- sem prefixo numérico (GENERATED)
  categoria             TEXT,                    -- categoria Omie
  grupo_omie            TEXT,                    -- grupo contábil Omie
  situacao              TEXT,                    -- A vencer, Pago, Vencido, etc.
  conta_corrente        TEXT,
  observacao            TEXT,
  parcela               TEXT,
  conciliado            BOOLEAN DEFAULT false,
  e_previsao            BOOLEAN DEFAULT false,   -- true se fornecedor = "PREVISAO"
  origem                TEXT,                    -- "sync", "ia_classificacao", "manual"
  orcamento_item_id     UUID REFERENCES orcamento_items(id), -- vínculo com orçamento
  deleted_at            TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, omie_id)
);

-- Coluna gerada para limpar prefixo do departamento
ALTER TABLE omie_lancamentos
  ADD COLUMN departamento_limpo TEXT
  GENERATED ALWAYS AS (
    TRIM(regexp_replace(departamento, '^[\d\.\s]+', ''))
  ) STORED;
```

---

### `documentos` — Documentos enviados pelo cliente
```sql
CREATE TABLE documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  nome_arquivo    TEXT NOT NULL,
  storage_path    TEXT NOT NULL,           -- bucket: docs/{company_id}/{ano}/{mes}/
  tamanho_bytes   BIGINT,
  tipo_mime       TEXT,
  enviado_por     UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'recebido'
                  CHECK (status IN (
                    'recebido',             -- upload feito
                    'processando',          -- IA analisando
                    'classificado',         -- IA terminou, aguarda auditoria
                    'aprovado',             -- auditor aprovou
                    'corrigido',            -- auditor corrigiu e aprovou
                    'rejeitado',            -- auditor rejeitou
                    'executado',            -- lançado no Omie
                    'erro'                  -- falha no processamento
                  )),
  erro_detalhe    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `classificacoes_ia` — Propostas da IA (fila de auditoria)
```sql
CREATE TABLE classificacoes_ia (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id),
  documento_id          UUID NOT NULL REFERENCES documentos(id),
  -- Dados extraídos pela IA
  fornecedor_extraido   TEXT,
  cnpj_extraido         TEXT,
  valor_extraido        NUMERIC(15,2),
  data_vencimento_ext   DATE,
  itens_extraidos       JSONB,              -- [{descricao, quantidade, valor_unit, valor_total}]
  -- Classificação proposta pela IA
  departamento_proposto TEXT,               -- ex: "3.2 RADIER"
  categoria_proposta    TEXT,               -- ex: "FERRAGEM"
  grupo_proposto        TEXT,               -- ex: "RADIER - 44,38 M²"
  -- Match com orçamento
  orcamento_item_id     UUID REFERENCES orcamento_items(id),
  valor_orcado_item     NUMERIC(15,2),      -- valor total do item orçado
  valor_ja_consumido    NUMERIC(15,2),      -- quanto já foi consumido antes
  valor_saldo_antes     NUMERIC(15,2),      -- saldo disponível antes deste lançamento
  valor_saldo_depois    NUMERIC(15,2),      -- saldo projetado após este lançamento
  -- Confiança
  score_confianca       NUMERIC(4,3),       -- 0.000 a 1.000
  justificativa_ia      TEXT,               -- texto explicando a classificação
  -- Auditoria
  status_auditoria      TEXT DEFAULT 'pendente'
                        CHECK (status_auditoria IN ('pendente','aprovado','corrigido','rejeitado')),
  auditado_por          UUID REFERENCES auth.users(id),
  auditado_em           TIMESTAMPTZ,
  correcoes             JSONB,              -- {campo: {de: "X", para: "Y"}} se corrigido
  motivo_rejeicao       TEXT,
  -- Resultado
  omie_lancamento_id    UUID REFERENCES omie_lancamentos(id), -- quando executado no Omie
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `alertas` — Alertas de desvio e notificações
```sql
CREATE TABLE alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  tipo            TEXT NOT NULL CHECK (tipo IN (
    'desvio_orcamento',       -- realizado > X% do orçado
    'saldo_insuficiente',     -- saldo do grupo abaixo do necessário
    'documento_pendente',     -- doc na fila há mais de X horas
    'sync_falha',             -- erro no sync com Omie
    'classificacao_baixa'     -- score IA < limiar
  )),
  severidade      TEXT DEFAULT 'media'
                  CHECK (severidade IN ('baixa','media','alta','critica')),
  titulo          TEXT NOT NULL,
  mensagem        TEXT,
  dados           JSONB,                -- contexto específico do alerta
  lido            BOOLEAN DEFAULT false,
  lido_por        UUID REFERENCES auth.users(id),
  lido_em         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `audit_logs` — Logs Imutáveis (Insert Only)
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  user_id     UUID REFERENCES auth.users(id),
  agente      TEXT DEFAULT 'humano'
              CHECK (agente IN ('humano','ia','sistema','cron')),
  tabela      TEXT NOT NULL,
  registro_id UUID,
  acao        TEXT NOT NULL
              CHECK (acao IN ('INSERT','UPDATE','DELETE','APPROVE','REJECT','CORRECT','CLASSIFY','SYNC','EXECUTE_OMIE')),
  old_data    JSONB,
  new_data    JSONB,
  metadata    JSONB,              -- dados extras (score IA, tempo processamento, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert only — sem UPDATE/DELETE policies
```

---

## Views Materializadas

### `v_orcado_vs_realizado` — Comparativo por grupo
```sql
CREATE MATERIALIZED VIEW v_orcado_vs_realizado AS
SELECT
  og.company_id,
  og.id AS grupo_id,
  og.nome AS grupo,
  og.valor_total AS valor_orcado,
  COALESCE(SUM(oi.valor_consumido), 0) AS valor_consumido,
  og.valor_total - COALESCE(SUM(oi.valor_consumido), 0) AS valor_saldo,
  CASE WHEN og.valor_total > 0
    THEN ROUND(100.0 * COALESCE(SUM(oi.valor_consumido), 0) / og.valor_total, 2)
    ELSE 0
  END AS pct_consumido,
  COUNT(DISTINCT oi.id) FILTER (WHERE oi.valor_consumido > 0) AS itens_com_consumo,
  COUNT(DISTINCT oi.id) AS total_itens
FROM orcamento_grupos og
LEFT JOIN orcamento_items oi ON oi.grupo_id = og.id AND oi.ativo = true
GROUP BY og.company_id, og.id, og.nome, og.valor_total;

CREATE UNIQUE INDEX ON v_orcado_vs_realizado (grupo_id);
```

### `v_curva_s` — Evolução acumulada por quinzena
```sql
CREATE MATERIALIZED VIEW v_curva_s AS
WITH quinzenas AS (
  SELECT unnest(ARRAY['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10']) AS quinzena
),
orcado_por_q AS (
  SELECT
    oi.company_id,
    q.quinzena,
    SUM(oi.valor_orcado * COALESCE((oi.quinzenas->>q.quinzena)::NUMERIC, 0)) AS valor_orcado_q
  FROM orcamento_items oi
  CROSS JOIN quinzenas q
  WHERE oi.ativo = true
  GROUP BY oi.company_id, q.quinzena
),
realizado_por_q AS (
  SELECT
    ol.company_id,
    -- mapear data para quinzena (lógica simplificada)
    CASE
      WHEN ol.data_vencimento < '2026-03-23' THEN 'Q1'
      WHEN ol.data_vencimento < '2026-04-06' THEN 'Q2'
      WHEN ol.data_vencimento < '2026-04-20' THEN 'Q3'
      WHEN ol.data_vencimento < '2026-05-04' THEN 'Q4'
      WHEN ol.data_vencimento < '2026-05-18' THEN 'Q5'
      WHEN ol.data_vencimento < '2026-06-01' THEN 'Q6'
      WHEN ol.data_vencimento < '2026-06-15' THEN 'Q7'
      WHEN ol.data_vencimento < '2026-06-29' THEN 'Q8'
      WHEN ol.data_vencimento < '2026-07-13' THEN 'Q9'
      ELSE 'Q10'
    END AS quinzena,
    SUM(ABS(ol.valor)) AS valor_realizado_q
  FROM omie_lancamentos ol
  WHERE ol.e_previsao = false AND ol.tipo = 'pagar' AND ol.deleted_at IS NULL
  GROUP BY ol.company_id, quinzena
)
SELECT
  o.company_id,
  o.quinzena,
  o.valor_orcado_q,
  COALESCE(r.valor_realizado_q, 0) AS valor_realizado_q,
  SUM(o.valor_orcado_q) OVER (PARTITION BY o.company_id ORDER BY o.quinzena) AS orcado_acumulado,
  SUM(COALESCE(r.valor_realizado_q, 0)) OVER (PARTITION BY o.company_id ORDER BY o.quinzena) AS realizado_acumulado
FROM orcado_por_q o
LEFT JOIN realizado_por_q r ON o.company_id = r.company_id AND o.quinzena = r.quinzena
ORDER BY o.company_id, o.quinzena;
```

### `v_alertas_desvio` — Categorias com desvio acima do limiar
```sql
CREATE MATERIALIZED VIEW v_alertas_desvio AS
SELECT
  v.company_id,
  v.grupo,
  v.valor_orcado,
  v.valor_consumido,
  v.pct_consumido,
  c.config->>'limiar_desvio_alerta' AS limiar,
  CASE
    WHEN v.pct_consumido > 100 THEN 'acima_orcado'
    WHEN v.pct_consumido > (c.config->>'limiar_desvio_alerta')::NUMERIC * 100 THEN 'atencao'
    ELSE 'ok'
  END AS status_desvio
FROM v_orcado_vs_realizado v
JOIN companies c ON c.id = v.company_id;
```

---

## Triggers

### Audit log automático
```sql
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, agente, tabela, registro_id, acao, old_data, new_data)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    'humano',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar em tabelas financeiras
CREATE TRIGGER audit_orcamento_items AFTER INSERT OR UPDATE OR DELETE ON orcamento_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_omie_lancamentos AFTER INSERT OR UPDATE OR DELETE ON omie_lancamentos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_classificacoes_ia AFTER INSERT OR UPDATE OR DELETE ON classificacoes_ia
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_documentos AFTER INSERT OR UPDATE OR DELETE ON documentos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

### Atualizar valor_consumido ao vincular lançamento real
```sql
CREATE OR REPLACE FUNCTION update_consumido_on_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.orcamento_item_id IS NOT NULL AND NEW.e_previsao = false THEN
    UPDATE orcamento_items
    SET valor_consumido = valor_consumido + ABS(NEW.valor),
        updated_at = NOW()
    WHERE id = NEW.orcamento_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER link_consumo AFTER INSERT ON omie_lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_consumido_on_link();
```

---

## RLS (Exemplo padrão)

```sql
-- Aplicar em TODAS as tabelas
ALTER TABLE orcamento_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON orcamento_items
  FOR ALL USING (user_can_access_company(auth.uid(), company_id));

-- Audit logs: insert only para todos, select apenas para admin
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_all" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "select_admin" ON audit_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin','supervisor')
    AND active = true
  )
);
```

---

## Edge Functions (Resumo)

| Function | Trigger | Descrição |
|---|---|---|
| `process-document` | Upload no Storage | IA extrai dados + classifica + propõe match |
| `execute-omie` | Aprovação na auditoria | Cria real + ajusta previsão via API Omie |
| `sync-omie` | pg_cron diário (06:00) | Pull completo de lançamentos atualizados |
| `refresh-views` | Após sync-omie | Refresh das views materializadas |
| `check-desvios` | Após refresh-views | Gera alertas se desvio > limiar |

---

## Tipos TypeScript (gerar com Supabase CLI)

```bash
supabase gen types typescript --project-id <id> > src/types/supabase.ts
```

Usar **sempre** os tipos gerados. Nunca `any`.
