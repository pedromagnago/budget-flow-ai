
-- ================================================
-- SEED: Budget items, Omie lancamentos, documents, classificacoes, schedule, cenario
-- ================================================

-- Budget Items (sample ~20)
INSERT INTO public.orcamento_items (company_id, grupo_id, apropriacao, tipo, item, unidade, quantidade_total, custo_unitario, valor_orcado, valor_consumido)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  g.id,
  v.apropriacao, v.tipo, v.item, v.unidade, v.qtd, v.custo_unit, v.valor_orcado, v.valor_consumido
FROM (VALUES
  ('RADIER - 44,38 M²', 'RADIER', 'MAO DE OBRA', 'Mao de obra Terceirizada Radier', 'vb', 64, 2000.00, 128000.00, 64000.00),
  ('RADIER - 44,38 M²', 'RADIER', 'MADEIRA', 'ripas de 5cm x 2,7m de 25mm', 'pç', 704, 6.00, 4224.00, 0.00),
  ('RADIER - 44,38 M²', 'RADIER', 'FERRAGEM', 'Aço Tela Q-138', 'unidade', 640, 75.00, 48000.00, 12000.00),
  ('RADIER - 44,38 M²', 'RADIER', 'CONCRETO', 'Concreto Usinado 25 MPA', 'm³', 448, 450.00, 201600.00, 0.00),
  ('PAREDES (102,5m² de área interna e externa)', 'PAREDES COM CONCRETO', 'FABRICA', 'contrato industrialização paredes', 'vb', 64, 5000.00, 320000.00, 0.00),
  ('PAREDES (102,5m² de área interna e externa)', 'PAREDES COM CONCRETO', 'MAO DE OBRA', 'Montagem de paredes', 'vb', 64, 3500.00, 224000.00, 0.00),
  ('PAREDES (102,5m² de área interna e externa)', 'PAREDES COM CONCRETO', 'TRANSPORTE', 'Frete paredes pré-moldadas', 'viagem', 32, 2500.00, 80000.00, 0.00),
  ('ELETRICA EFIAÇÃO + TOMADAS', 'ELETRICA', 'ELETRICO', 'Cabo unipolar 2,5mm²', 'm', 12800, 0.4535, 5804.80, 5804.80),
  ('ELETRICA EFIAÇÃO + TOMADAS', 'ELETRICA', 'ELETRICO', 'Disjuntor monopolar 16A', 'unidade', 384, 12.50, 4800.00, 0.00),
  ('COBERTURA', 'COBERTURA', 'MADEIRA', 'Caibro 5x6cm', 'm', 4480, 8.50, 38080.00, 0.00),
  ('COBERTURA', 'COBERTURA', 'TELHA', 'Telha cerâmica', 'unidade', 25600, 2.80, 71680.00, 0.00),
  ('HIDRO SANITARIO - RADIER', 'HIDRAULICA', 'TUBOS', 'Tubo PVC 100mm', 'm', 1280, 18.50, 23680.00, 0.00),
  ('PINTURA', 'PINTURA', 'TINTA', 'Tinta acrílica 18L', 'lata', 256, 280.00, 71680.00, 0.00),
  ('PISO', 'PISO', 'CERAMICA', 'Piso cerâmico 45x45', 'm²', 5760, 22.00, 126720.00, 0.00),
  ('SERVIÇOS', 'SERVICOS', 'ADMINISTRACAO', 'Administração geral de obra', 'mês', 5, 120000.00, 600000.00, 120000.00),
  ('CAPITAL DE GIRO', 'ADMINISTRATIVO', 'FINANCEIRO', 'Capital de giro operacional', 'mês', 5, 100000.00, 500000.00, 100000.00),
  ('INSTALACOES / CANTEIRO', 'CANTEIRO', 'OBRA', 'Instalação do canteiro de obras', 'vb', 1, 53760.00, 53760.00, 53760.00),
  ('RECEITAS', 'RECEITAS', 'MEDICAO', 'Medição 1', 'vb', 1, 855078.00, 855078.00, 0.00),
  ('RECEITAS', 'RECEITAS', 'MEDICAO', 'Medição 2', 'vb', 1, 758705.00, 758705.00, 0.00),
  ('RECEITAS', 'RECEITAS', 'APORTE', 'Aporte inicial investidor', 'vb', 1, 720000.00, 720000.00, 720000.00)
) AS v(grupo_nome, apropriacao, tipo, item, unidade, qtd, custo_unit, valor_orcado, valor_consumido)
JOIN public.orcamento_grupos g ON g.nome = v.grupo_nome AND g.company_id = 'a0000000-0000-0000-0000-000000000001';

-- Omie Lancamentos (10 entries: 5 previsao + 5 real)
INSERT INTO public.omie_lancamentos (company_id, omie_id, tipo, fornecedor_razao, fornecedor_cnpj, valor, data_vencimento, departamento, categoria, e_previsao, origem) VALUES
('a0000000-0000-0000-0000-000000000001', 1001, 'pagar', 'PREVISAO', NULL, -128000.00, '2026-03-20', '3.2 RADIER', 'MAO DE OBRA', true, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1002, 'pagar', 'PREVISAO', NULL, -201600.00, '2026-04-05', '3.2 RADIER', 'CONCRETO', true, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1003, 'pagar', 'PREVISAO', NULL, -320000.00, '2026-04-15', '3.3 PAREDES COM CONCRETO', 'FABRICA', true, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1004, 'pagar', 'PREVISAO', NULL, -224000.00, '2026-05-01', '3.3 PAREDES COM CONCRETO', 'MAO DE OBRA', true, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1005, 'pagar', 'PREVISAO', NULL, -71680.00, '2026-05-15', '3.5 COBERTURA', 'TELHA', true, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1006, 'pagar', 'PREVIBRAS LTDA', '12.345.678/0001-90', -48000.00, '2026-03-18', '3.2 RADIER', 'FERRAGEM', false, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1007, 'pagar', 'JM FERRAGENS ME', '98.765.432/0001-10', -12000.00, '2026-03-15', '3.2 RADIER', 'FERRAGEM', false, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1008, 'pagar', 'ELETRO SUL MATERIAIS', '55.666.777/0001-88', -5804.80, '2026-03-12', '3.18 ELETRICA EFIAÇÃO + TOMADAS', 'ELETRICO', false, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1009, 'pagar', 'CANTEIRO OBRAS RS', '11.222.333/0001-44', -53760.00, '2026-03-10', '3.1 INSTALACOES / CANTEIRO', 'OBRA', false, 'sync'),
('a0000000-0000-0000-0000-000000000001', 1010, 'receber', 'SEHAB RS', '00.111.222/0001-33', 720000.00, '2026-03-09', NULL, 'APORTE', false, 'sync');

-- Documents (3)
INSERT INTO public.documentos (company_id, nome_arquivo, storage_path, tamanho_bytes, tipo_mime, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'NF_PREVIBRAS_MAR2026.pdf', 'docs/a0000000/2026/03/nf_previbras.pdf', 245000, 'application/pdf', 'classificado'),
('a0000000-0000-0000-0000-000000000001', 'PEDIDO_JM_FERRAGENS.pdf', 'docs/a0000000/2026/03/pedido_jm.pdf', 180000, 'application/pdf', 'aprovado'),
('a0000000-0000-0000-0000-000000000001', 'COMPROVANTE_CANTEIRO.jpg', 'docs/a0000000/2026/03/comp_canteiro.jpg', 520000, 'image/jpeg', 'executado');

-- Classificacoes IA (2: 1 pendente, 1 aprovada)
INSERT INTO public.classificacoes_ia (company_id, documento_id, fornecedor_extraido, cnpj_extraido, valor_extraido, data_vencimento_ext, departamento_proposto, categoria_proposta, grupo_proposto, score_confianca, justificativa_ia, status_auditoria)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  d.id,
  v.fornecedor, v.cnpj, v.valor, v.vencimento::date, v.depto, v.cat, v.grupo, v.score, v.justificativa, v.status
FROM (VALUES
  ('NF_PREVIBRAS_MAR2026.pdf', 'PREVIBRAS LTDA', '12.345.678/0001-90', 45600.00, '2026-04-15', '3.2 RADIER', 'FERRAGEM', 'RADIER - 44,38 M²', 0.870, 'NF de telas de aço Q-138, compatível com item Aço Tela Q-138 do grupo RADIER', 'pendente'),
  ('PEDIDO_JM_FERRAGENS.pdf', 'JM FERRAGENS ME', '98.765.432/0001-10', 12800.00, '2026-03-25', '3.2 RADIER', 'FERRAGEM', 'RADIER - 44,38 M²', 0.920, 'Pedido de ferragens diversas para radier, match exato com departamento e categoria', 'aprovado')
) AS v(doc_nome, fornecedor, cnpj, valor, vencimento, depto, cat, grupo, score, justificativa, status)
JOIN public.documentos d ON d.nome_arquivo = v.doc_nome AND d.company_id = 'a0000000-0000-0000-0000-000000000001';

-- Schedule: 12 cronograma_servicos
INSERT INTO public.cronograma_servicos (company_id, nome, preco_unitario, valor_total) VALUES
('a0000000-0000-0000-0000-000000000001', 'Instalações/Canteiros', 840.00, 53760.00),
('a0000000-0000-0000-0000-000000000001', 'Fundação Radier', 10442.64, 668329.04),
('a0000000-0000-0000-0000-000000000001', 'Hidrosanitário Radier', 2220.49, 142131.20),
('a0000000-0000-0000-0000-000000000001', 'Administração obra', 600000.00, 600000.00),
('a0000000-0000-0000-0000-000000000001', 'Paredes pré-moldadas', 39933.54, 2555746.80),
('a0000000-0000-0000-0000-000000000001', 'Estrutura telhado', 5920.43, 378887.36),
('a0000000-0000-0000-0000-000000000001', 'Impermeabilização', 1730.00, 110720.00),
('a0000000-0000-0000-0000-000000000001', 'Revestimentos', 3392.00, 217088.00),
('a0000000-0000-0000-0000-000000000001', 'Portas internas', 2326.00, 148864.00),
('a0000000-0000-0000-0000-000000000001', 'Elétrica', 3679.65, 235497.66),
('a0000000-0000-0000-0000-000000000001', 'Pintura interna', 2976.00, 190464.00),
('a0000000-0000-0000-0000-000000000001', 'Limpeza final', 260.00, 16640.00);

-- 8 Medicoes
INSERT INTO public.medicoes (company_id, numero, data_inicio, data_fim, valor_planejado, status) VALUES
('a0000000-0000-0000-0000-000000000001', 1, '2026-03-15', '2026-03-31', 855078.00, 'em_andamento'),
('a0000000-0000-0000-0000-000000000001', 2, '2026-04-01', '2026-04-15', 758705.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 3, '2026-04-16', '2026-04-30', 1110680.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 4, '2026-05-01', '2026-05-15', 1219494.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 5, '2026-05-16', '2026-05-31', 1842454.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 6, '2026-06-01', '2026-06-15', 838687.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 7, '2026-06-16', '2026-06-30', 419605.00, 'futura'),
('a0000000-0000-0000-0000-000000000001', 8, '2026-07-01', '2026-07-15', 315299.00, 'futura');

-- Cenario base
INSERT INTO public.cenarios (company_id, nome, descricao, tipo) VALUES
('a0000000-0000-0000-0000-000000000001', 'Base', 'Cenário base com previsões originais do orçamento', 'base');

-- Refresh materialized view
REFRESH MATERIALIZED VIEW public.v_orcado_vs_realizado;
