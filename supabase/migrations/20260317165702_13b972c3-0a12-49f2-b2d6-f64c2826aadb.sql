
-- ================================================
-- Triggers: audit log + consumo update
-- ================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (company_id, user_id, agente, tabela, registro_id, acao, old_data, new_data)
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
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Audit triggers on financial tables
CREATE TRIGGER audit_orcamento_items AFTER INSERT OR UPDATE OR DELETE ON public.orcamento_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_omie_lancamentos AFTER INSERT OR UPDATE OR DELETE ON public.omie_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_classificacoes_ia AFTER INSERT OR UPDATE OR DELETE ON public.classificacoes_ia
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_documentos AFTER INSERT OR UPDATE OR DELETE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Update consumido when real lancamento linked to orcamento item
CREATE OR REPLACE FUNCTION public.update_consumido_on_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.orcamento_item_id IS NOT NULL AND NEW.e_previsao = false THEN
    UPDATE public.orcamento_items
    SET valor_consumido = valor_consumido + ABS(NEW.valor),
        updated_at = NOW()
    WHERE id = NEW.orcamento_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER link_consumo AFTER INSERT ON public.omie_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_consumido_on_link();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orcamento_items_updated_at BEFORE UPDATE ON public.orcamento_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_omie_lancamentos_updated_at BEFORE UPDATE ON public.omie_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_classificacoes_ia_updated_at BEFORE UPDATE ON public.classificacoes_ia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_medicoes_updated_at BEFORE UPDATE ON public.medicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cenarios_updated_at BEFORE UPDATE ON public.cenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Materialized view: orcado vs realizado
CREATE MATERIALIZED VIEW public.v_orcado_vs_realizado AS
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
FROM public.orcamento_grupos og
LEFT JOIN public.orcamento_items oi ON oi.grupo_id = og.id AND oi.ativo = true
GROUP BY og.company_id, og.id, og.nome, og.valor_total;

CREATE UNIQUE INDEX ON public.v_orcado_vs_realizado (grupo_id);
