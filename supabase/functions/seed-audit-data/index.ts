import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const companyId = "a0000000-0000-0000-0000-000000000001";

  // Insert 12 fake documents
  const docs = [
    { nome: "NF_CIGAME_Tubos_PVC.pdf", mime: "application/pdf", fornecedor: "CIGAME Materiais Hidráulicos" },
    { nome: "NF_Concreteira_RS_Radier.pdf", mime: "application/pdf", fornecedor: "Concreteira RS Ltda" },
    { nome: "Boleto_SteelFrame_Cobertura.pdf", mime: "application/pdf", fornecedor: "Steel Frame RS" },
    { nome: "NF_Ceramica_Azulejos.pdf", mime: "application/pdf", fornecedor: "Cerâmica Nacional" },
    { nome: "Recibo_Dione_Montagem.jpg", mime: "image/jpeg", fornecedor: "Dione Serviços" },
    { nome: "NF_Aluminio_Portas.pdf", mime: "application/pdf", fornecedor: "Alumínio Sul" },
    { nome: "NF_Tintas_Massa.pdf", mime: "application/pdf", fornecedor: "Tintas Renner" },
    { nome: "Boleto_Eletrica_Cabos.pdf", mime: "application/pdf", fornecedor: "Eletrocabos RS" },
    { nome: "NF_Fortlev_CxAgua.pdf", mime: "application/pdf", fornecedor: "Fortlev Ind. e Com." },
    { nome: "NF_Soprano_Portas.pdf", mime: "application/pdf", fornecedor: "Soprano Esquadrias" },
    { nome: "NF_Brita_Agregados.pdf", mime: "application/pdf", fornecedor: "Agregados SFP" },
    { nome: "Recibo_Charles_Folha.jpg", mime: "image/jpeg", fornecedor: "Charles - Gestão MO" },
  ];

  const docIds: string[] = [];
  for (const d of docs) {
    const { data, error } = await admin.from("documentos").insert({
      company_id: companyId,
      nome_arquivo: d.nome,
      storage_path: `${companyId}/seed_${d.nome}`,
      tipo_mime: d.mime,
      tamanho_bytes: Math.floor(Math.random() * 5000000) + 500000,
      status: "classificado",
    }).select("id").single();
    if (error) { console.error(error); continue; }
    docIds.push(data.id);
  }

  // Budget item references
  const items = [
    { itemId: null, grupo: "ESPERAS DE ESGOTO RADIER", dept: "Material Hidráulico", cat: "Tubos PVC", valor: 18934.32, score: 0.92, fornecedor: "CIGAME Materiais Hidráulicos", cnpj: "12.345.678/0001-01", orcado: 18934.32, consumido: 0 },
    { itemId: "6b91bc3c-257f-4116-be9e-4030fd13158c", grupo: "RADIER", dept: "Concreto", cat: "Concreto Usinado", valor: 79635.20, score: 0.97, fornecedor: "Concreteira RS Ltda", cnpj: "23.456.789/0001-02", orcado: 318540.80, consumido: 0 },
    { itemId: "0385b8e3-8ad3-482f-9acc-02e091f3a27e", grupo: "COBERTURA", dept: "Estrutura Metálica", cat: "Steel Frame", valor: 49600.00, score: 0.88, fornecedor: "Steel Frame RS", cnpj: "34.567.890/0001-03", orcado: 198400.00, consumido: 0 },
    { itemId: null, grupo: "AZULEJOS", dept: "Revestimento", cat: "Cerâmica", valor: 23742.40, score: 0.85, fornecedor: "Cerâmica Nacional", cnpj: "45.678.901/0001-04", orcado: 115070.40, consumido: 0 },
    { itemId: "89ac8d5d-0af3-49c6-93d4-7cdb8744430f", grupo: "PAREDES COM CONCRETO", dept: "Mão de Obra", cat: "Montagem", valor: 40000.00, score: 0.94, fornecedor: "Dione Serviços", cnpj: "56.789.012/0001-05", orcado: 159999.62, consumido: 0 },
    { itemId: null, grupo: "ESQUADRIA DE ALUMÍNIO", dept: "Esquadrias", cat: "Portas Alumínio", valor: 39397.12, score: 0.78, fornecedor: "Alumínio Sul", cnpj: "67.890.123/0001-06", orcado: 161857.92, consumido: 0 },
    { itemId: null, grupo: "MASSA NIVELADORA", dept: "Tintas", cat: "Massa Fina", valor: 41280.00, score: 0.91, fornecedor: "Tintas Renner", cnpj: "78.901.234/0001-07", orcado: 115563.52, consumido: 0 },
    { itemId: null, grupo: "ELÉTRICA - FIAÇÃO E TOMADAS", dept: "Elétrica", cat: "Cabos", valor: 15680.00, score: 0.83, fornecedor: "Eletrocabos RS", cnpj: "89.012.345/0001-08", orcado: 235497.66, consumido: 0 },
    { itemId: null, grupo: "BARRILETE E RESERVATÓRIO", dept: "Hidráulica", cat: "Caixa d'Água", valor: 15353.60, score: 0.96, fornecedor: "Fortlev Ind. e Com.", cnpj: "90.123.456/0001-09", orcado: 36543.62, consumido: 0 },
    { itemId: null, grupo: "ESQUADRIA DE MADEIRA", dept: "Esquadrias", cat: "Portas Internas", valor: 51840.00, score: 0.90, fornecedor: "Soprano Esquadrias", cnpj: "01.234.567/0001-10", orcado: 88640.00, consumido: 0 },
    { itemId: null, grupo: "RADIER", dept: "Agregados", cat: "Brita Graduada", valor: 33842.97, score: 0.55, fornecedor: "Agregados SFP", cnpj: "11.222.333/0001-11", orcado: 668329.04, consumido: 0 },
    { itemId: "add08988-d528-4a5e-8e0b-4f04204775ce", grupo: "RADIER", dept: "Mão de Obra", cat: "Radier", valor: 32000.00, score: 0.72, fornecedor: "Charles - Gestão MO", cnpj: null, orcado: 128000.00, consumido: 0 },
  ];

  const statuses = ["pendente","pendente","pendente","pendente","pendente","pendente","pendente","pendente","aprovado","aprovado","pendente","pendente"];
  const dates = [
    "2026-03-15", "2026-03-16", "2026-03-16", "2026-03-17", "2026-03-17",
    "2026-03-17", "2026-03-18", "2026-03-18", "2026-03-14", "2026-03-15",
    "2026-03-18", "2026-03-18",
  ];

  for (let i = 0; i < Math.min(docIds.length, items.length); i++) {
    const it = items[i];
    const saldoAntes = it.orcado - it.consumido;
    const saldoDepois = saldoAntes - it.valor;
    const status = statuses[i];

    await admin.from("classificacoes_ia").insert({
      documento_id: docIds[i],
      company_id: companyId,
      fornecedor_extraido: it.fornecedor,
      cnpj_extraido: it.cnpj,
      valor_extraido: it.valor,
      data_vencimento_ext: dates[i],
      departamento_proposto: it.dept,
      categoria_proposta: it.cat,
      grupo_proposto: it.grupo,
      orcamento_item_id: it.itemId,
      score_confianca: it.score,
      justificativa_ia: `Documento identificado como ${it.cat} do fornecedor ${it.fornecedor}. Classificado no grupo ${it.grupo} com base nos itens descritos.`,
      status_auditoria: status,
      valor_orcado_item: it.orcado,
      valor_ja_consumido: it.consumido,
      valor_saldo_antes: saldoAntes,
      valor_saldo_depois: saldoDepois,
      auditado_em: status === "aprovado" ? new Date().toISOString() : null,
      created_at: new Date(dates[i] + "T10:00:00Z").toISOString(),
    });
  }

  return new Response(JSON.stringify({ success: true, docs: docIds.length, classifications: items.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
