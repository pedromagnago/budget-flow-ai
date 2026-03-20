import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // --- Input ---
    const { documento_id } = await req.json();
    if (!documento_id) return json({ error: "documento_id obrigatório" }, 400);

    // --- Fetch document ---
    const { data: doc, error: docErr } = await admin
      .from("documentos")
      .select("*")
      .eq("id", documento_id)
      .single();
    if (docErr || !doc) return json({ error: "Documento não encontrado" }, 404);

    const companyId = doc.company_id;

    // --- Download file from storage ---
    const { data: fileData, error: fileErr } = await admin.storage
      .from("documentos")
      .download(doc.storage_path);
    if (fileErr || !fileData) {
      await admin.from("documentos").update({ status: "erro", erro_detalhe: "Falha ao baixar arquivo do storage" }).eq("id", documento_id);
      return json({ error: "Falha ao baixar arquivo" }, 500);
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const base64 = btoa(String.fromCharCode(...fileBytes));
    const mimeType = doc.tipo_mime || "application/octet-stream";

    // --- Fetch budget context ---
    const [gruposRes, itensRes, deparaRes, configRes] = await Promise.all([
      admin.from("orcamento_grupos").select("id, nome").eq("company_id", companyId).eq("ativo", true),
      admin.from("orcamento_items").select("id, item, apropriacao, grupo_id, valor_orcado, valor_consumido, valor_saldo").eq("company_id", companyId).eq("ativo", true),
      admin.from("categoria_depara").select("departamento, apropriacao, tipo_excel").eq("company_id", companyId).eq("ativo", true),
      admin.from("companies").select("config").eq("id", companyId).single(),
    ]);

    const grupos = gruposRes.data ?? [];
    const itens = itensRes.data ?? [];
    const depara = deparaRes.data ?? [];
    const companyConfig = {
      score_minimo_auto_approve: 0.95,
      auto_approve_ativo: false,
      ...(configRes.data?.config as Record<string, unknown> ?? {}),
    };

    // Build context string for Gemini
    const grupoMap = Object.fromEntries(grupos.map((g: any) => [g.id, g.nome]));
    const contextLines: string[] = [];
    contextLines.push("## Grupos orçamentários:");
    grupos.forEach((g: any) => contextLines.push(`- ${g.nome} (id: ${g.id})`));
    contextLines.push("\n## Itens orçamentários:");
    itens.forEach((i: any) => {
      const grupo = grupoMap[i.grupo_id] || "?";
      contextLines.push(`- [${grupo}] ${i.item} | apropriação: ${i.apropriacao} | orçado: ${i.valor_orcado} | consumido: ${i.valor_consumido ?? 0} | saldo: ${i.valor_saldo ?? i.valor_orcado} | id: ${i.id}`);
    });
    if (depara.length) {
      contextLines.push("\n## Categorias de-para (mapeamento departamento → apropriação):");
      depara.forEach((d: any) => contextLines.push(`- dept: ${d.departamento} | tipo: ${d.tipo_excel ?? "-"} | apropriação: ${d.apropriacao}`));
    }

    // --- Call Gemini ---
    const systemPrompt = `Você é um assistente de classificação de documentos fiscais para uma construtora.
Analise o documento enviado (pode ser nota fiscal, boleto, recibo, etc.) e extraia as informações relevantes.
Em seguida, classifique o documento no item orçamentário mais adequado com base no contexto fornecido.

CONTEXTO DO ORÇAMENTO DA EMPRESA:
${contextLines.join("\n")}

INSTRUÇÕES:
1. Extraia: fornecedor (razão social), CNPJ, valor total, data de vencimento
2. Com base na descrição dos itens/serviços do documento, identifique o grupo e item orçamentário mais provável
3. Proponha departamento e categoria usando o mapeamento de-para quando disponível
4. Atribua um score de confiança de 0 a 1 (1 = certeza total)
5. Justifique brevemente sua classificação
6. Se não conseguir identificar com segurança, use score baixo e explique na justificativa

Use SEMPRE a tool classify_document para retornar o resultado.`;

    const userContent: any[] = [];
    if (mimeType.startsWith("image/")) {
      userContent.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
    } else if (mimeType === "application/pdf") {
      userContent.push({ type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } });
    } else {
      // XML or text
      const textContent = new TextDecoder().decode(fileBytes);
      userContent.push({ type: "text", text: `Conteúdo do documento (${doc.nome_arquivo}):\n\n${textContent.substring(0, 50000)}` });
    }
    userContent.push({ type: "text", text: `Arquivo: ${doc.nome_arquivo} (${mimeType})` });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_document",
              description: "Classifica o documento fiscal no orçamento da construtora",
              parameters: {
                type: "object",
                properties: {
                  fornecedor: { type: "string", description: "Razão social do fornecedor" },
                  cnpj: { type: "string", description: "CNPJ do fornecedor (formato XX.XXX.XXX/XXXX-XX)" },
                  valor: { type: "number", description: "Valor total do documento em reais" },
                  data_vencimento: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
                  departamento_proposto: { type: "string", description: "Departamento proposto para classificação" },
                  categoria_proposta: { type: "string", description: "Categoria proposta para classificação" },
                  grupo_proposto: { type: "string", description: "Nome do grupo orçamentário proposto" },
                  item_id: { type: "string", description: "UUID do item orçamentário mais adequado" },
                  score_confianca: { type: "number", description: "Score de confiança de 0 a 1" },
                  justificativa_ia: { type: "string", description: "Justificativa da classificação" },
                },
                required: ["fornecedor", "valor", "score_confianca", "justificativa_ia"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_document" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", status, errText);

      if (status === 429) {
        await admin.from("documentos").update({ status: "erro", erro_detalhe: "Rate limit atingido. Tente novamente em alguns minutos." }).eq("id", documento_id);
        return json({ error: "Rate limit atingido. Tente novamente em alguns minutos." }, 429);
      }
      if (status === 402) {
        await admin.from("documentos").update({ status: "erro", erro_detalhe: "Créditos de IA insuficientes." }).eq("id", documento_id);
        return json({ error: "Créditos de IA insuficientes. Adicione créditos no workspace Lovable." }, 402);
      }

      await admin.from("documentos").update({ status: "erro", erro_detalhe: `Erro IA: ${status}` }).eq("id", documento_id);
      return json({ error: "Erro na classificação IA" }, 500);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await admin.from("documentos").update({ status: "erro", erro_detalhe: "IA não retornou classificação estruturada" }).eq("id", documento_id);
      return json({ error: "IA não retornou classificação" }, 500);
    }

    const classification = JSON.parse(toolCall.function.arguments);

    // --- Calculate budget impact ---
    let valorOrcadoItem: number | null = null;
    let valorJaConsumido: number | null = null;
    let valorSaldoAntes: number | null = null;
    let valorSaldoDepois: number | null = null;
    let orcamentoItemId: string | null = classification.item_id || null;

    if (orcamentoItemId) {
      const matchedItem = itens.find((i: any) => i.id === orcamentoItemId);
      if (matchedItem) {
        valorOrcadoItem = matchedItem.valor_orcado;
        valorJaConsumido = matchedItem.valor_consumido ?? 0;
        valorSaldoAntes = matchedItem.valor_saldo ?? (matchedItem.valor_orcado - (matchedItem.valor_consumido ?? 0));
        valorSaldoDepois = valorSaldoAntes - (classification.valor ?? 0);
      } else {
        orcamentoItemId = null; // invalid id from AI
      }
    }

    // --- Determine auto-approve ---
    const score = classification.score_confianca ?? 0;
    const autoApprove =
      companyConfig.auto_approve_ativo === true &&
      score >= (companyConfig.score_minimo_auto_approve as number);

    const statusAuditoria = autoApprove ? "aprovado" : "pendente";

    // --- Insert classification ---
    const { error: insertErr } = await admin.from("classificacoes_ia").insert({
      documento_id,
      company_id: companyId,
      fornecedor_extraido: classification.fornecedor || null,
      cnpj_extraido: classification.cnpj || null,
      valor_extraido: classification.valor || null,
      data_vencimento_ext: classification.data_vencimento || null,
      departamento_proposto: classification.departamento_proposto || null,
      categoria_proposta: classification.categoria_proposta || null,
      grupo_proposto: classification.grupo_proposto || null,
      orcamento_item_id: orcamentoItemId,
      score_confianca: score,
      justificativa_ia: classification.justificativa_ia || null,
      status_auditoria: statusAuditoria,
      valor_orcado_item: valorOrcadoItem,
      valor_ja_consumido: valorJaConsumido,
      valor_saldo_antes: valorSaldoAntes,
      valor_saldo_depois: valorSaldoDepois,
      auditado_em: autoApprove ? new Date().toISOString() : null,
      auditado_por: autoApprove ? userId : null,
    });

    if (insertErr) {
      console.error("Insert classification error:", insertErr);
      await admin.from("documentos").update({ status: "erro", erro_detalhe: `Erro ao salvar classificação: ${insertErr.message}` }).eq("id", documento_id);
      return json({ error: "Erro ao salvar classificação" }, 500);
    }

    // --- Update document status ---
    await admin.from("documentos").update({ status: "classificado" }).eq("id", documento_id);

    return json({
      success: true,
      status_auditoria: statusAuditoria,
      score: score,
      fornecedor: classification.fornecedor,
      valor: classification.valor,
      auto_approved: autoApprove,
    });
  } catch (err) {
    console.error("classify-document error:", err);
    return json({ error: String(err) }, 500);
  }
});
