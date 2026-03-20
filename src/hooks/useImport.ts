import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type ImportTarget =
  | 'orcamento_grupos'
  | 'orcamento_items'
  | 'cronograma_servicos'
  | 'medicoes'
  | 'medicoes_metas'
  | 'lancamentos'
  | 'fornecedores'
  | 'categoria_depara';

export interface ParsedRow {
  [key: string]: string;
}

// ── CSV parser ──
export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: ParsedRow = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

// ── Column mapping presets ──
export const COLUMN_PRESETS: Record<ImportTarget, { required: string[]; optional: string[]; description: string }> = {
  orcamento_grupos: {
    required: ['nome', 'valor_total'],
    optional: [],
    description: 'Grupos do orçamento (Fundação, Estrutura, etc.)',
  },
  orcamento_items: {
    required: ['grupo_nome', 'item', 'apropriacao', 'valor_orcado'],
    optional: ['tipo', 'unidade', 'quantidade_unit', 'quantidade_total', 'custo_unitario', 'custo_casa'],
    description: 'Itens detalhados do orçamento vinculados a grupos',
  },
  cronograma_servicos: {
    required: ['nome', 'valor_total'],
    optional: ['preco_unitario', 'quantidade'],
    description: 'Serviços do cronograma físico',
  },
  medicoes: {
    required: ['numero', 'data_inicio', 'data_fim', 'valor_planejado'],
    optional: ['status'],
    description: 'Medições da obra (períodos e valores planejados)',
  },
  medicoes_metas: {
    required: ['medicao_numero', 'servico_nome', 'meta_percentual'],
    optional: ['meta_casas'],
    description: 'Metas por serviço × medição',
  },
  lancamentos: {
    required: ['tipo', 'valor', 'fornecedor_razao'],
    optional: [
      'data_vencimento', 'data_emissao', 'data_pagamento',
      'departamento', 'categoria', 'situacao', 'e_previsao',
      'observacao', 'forma_pagamento', 'numero_parcela', 'total_parcelas',
    ],
    description: 'Lançamentos financeiros — contas a pagar e a receber',
  },
  fornecedores: {
    required: ['razao_social'],
    optional: ['nome_fantasia', 'cnpj', 'email', 'telefone', 'categoria', 'observacoes'],
    description: 'Cadastro de fornecedores (materiais, mão de obra, serviços)',
  },
  categoria_depara: {
    required: ['apropriacao', 'departamento'],
    optional: ['tipo_excel'],
    description: 'Mapeamento de categorias do orçamento',
  },
};

// ── Import hook ──
export function useDataImport() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importData = useCallback(async (
    target: ImportTarget,
    rows: ParsedRow[],
    columnMap: Record<string, string>,
  ) => {
    if (!companyId) {
      toast.error('Empresa não selecionada');
      return { success: 0, errors: 0 };
    }

    setImporting(true);
    setProgress(0);
    let success = 0;
    let errors = 0;

    try {
      // For orcamento_items, we need to resolve grupo_nome → grupo_id
      let grupoMap: Record<string, string> = {};
      if (target === 'orcamento_items') {
        const { data: grupos } = await supabase
          .from('orcamento_grupos')
          .select('id, nome')
          .eq('company_id', companyId);
        grupoMap = (grupos ?? []).reduce((acc, g) => { acc[g.nome.toLowerCase().trim()] = g.id; return acc; }, {} as Record<string, string>);
      }

      // For medicoes_metas, resolve servico_nome → servico_id
      let servicoMap: Record<string, string> = {};
      if (target === 'medicoes_metas') {
        const { data: servicos } = await supabase
          .from('cronograma_servicos')
          .select('id, nome')
          .eq('company_id', companyId);
        servicoMap = (servicos ?? []).reduce((acc, s) => { acc[s.nome.toLowerCase().trim()] = s.id; return acc; }, {} as Record<string, string>);
      }

      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const mapped = batch.map(row => {
          const obj: Record<string, unknown> = { company_id: companyId };

          for (const [dbCol, csvCol] of Object.entries(columnMap)) {
            if (!csvCol || csvCol === '__skip__') continue;
            let val: unknown = row[csvCol];

            // Type coercion
            if (['valor_total', 'valor_orcado', 'valor', 'preco_unitario', 'custo_unitario', 'custo_casa', 'meta_percentual', 'valor_planejado', 'valor_liberado'].includes(dbCol)) {
              val = parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
            }
            if (['numero', 'medicao_numero', 'quantidade', 'quantidade_unit', 'quantidade_total', 'meta_casas', 'linha_origem'].includes(dbCol)) {
              val = parseInt(String(val)) || 0;
            }
            if (['e_previsao', 'conciliado', 'ativo', 'match_automatico'].includes(dbCol)) {
              val = ['true', '1', 'sim', 'yes', 'x'].includes(String(val).toLowerCase().trim());
            }

            obj[dbCol] = val;
          }

          // Resolve grupo_nome
          if (target === 'orcamento_items' && columnMap['grupo_nome']) {
            const gName = String(row[columnMap['grupo_nome']] ?? '').toLowerCase().trim();
            obj['grupo_id'] = grupoMap[gName] ?? null;
            delete obj['grupo_nome'];
          }

          // Resolve servico_nome
          if (target === 'medicoes_metas' && columnMap['servico_nome']) {
            const sName = String(row[columnMap['servico_nome']] ?? '').toLowerCase().trim();
            obj['servico_id'] = servicoMap[sName] ?? null;
            delete obj['servico_nome'];
          }

          return obj;
        });

        const tableName = target as string;
        const { error } = await supabase.from(tableName as 'orcamento_grupos').insert(mapped as never[]);
        if (error) {
          console.error('Import batch error:', error);
          errors += batch.length;
        } else {
          success += batch.length;
        }
        setProgress(Math.round(((i + batch.length) / rows.length) * 100));
      }

      qc.invalidateQueries();
      if (errors === 0) {
        toast.success(`${success} registros importados com sucesso`);
      } else {
        toast.warning(`${success} importados, ${errors} com erro`);
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro durante importação');
    } finally {
      setImporting(false);
      setProgress(0);
    }

    return { success, errors };
  }, [companyId, qc]);

  return { importData, importing, progress };
}
