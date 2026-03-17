
-- Revoke direct API access to materialized view
REVOKE ALL ON public.v_orcado_vs_realizado FROM anon, authenticated;

-- Create a function to access it securely
CREATE OR REPLACE FUNCTION public.get_orcado_vs_realizado(_company_id UUID)
RETURNS TABLE(
  grupo_id UUID, grupo TEXT, valor_orcado NUMERIC, valor_consumido NUMERIC,
  valor_saldo NUMERIC, pct_consumido NUMERIC, itens_com_consumo BIGINT, total_itens BIGINT
) AS $$
  SELECT grupo_id, grupo, valor_orcado, valor_consumido, valor_saldo, pct_consumido, itens_com_consumo, total_itens
  FROM public.v_orcado_vs_realizado
  WHERE company_id = _company_id
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_orcado_vs_realizado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
