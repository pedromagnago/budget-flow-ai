
ALTER TABLE public.orcamento_items
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS parcelamento text,
  ADD COLUMN IF NOT EXISTS observacoes text;
