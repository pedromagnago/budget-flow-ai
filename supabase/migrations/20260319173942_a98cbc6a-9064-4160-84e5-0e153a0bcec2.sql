
-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.vw_servicos_situacao SET (security_invoker = true);
ALTER VIEW public.vw_medicoes_financeiro SET (security_invoker = true);
ALTER VIEW public.vw_saldo_contas SET (security_invoker = true);
ALTER VIEW public.vw_lancamentos_status SET (security_invoker = true);
