import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseCSV, type ParsedRow } from './useImport';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface SmartImportSummary {
  grupos: { nome: string; valorTotal: number; itemCount: number }[];
  totalItems: number;
  validationErrors: ValidationError[];
  quinzenaColumns: string[];
}

const REQUIRED_COLUMNS = ['grupo', 'item', 'apropriacao', 'valor_orcado'];
const NUMERIC_COLUMNS = ['qtd_unit', 'qtd_total', 'custo_unitario', 'custo_casa', 'valor_orcado'];

function parseBRNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  // Support Brazilian format: 1.234,56 → 1234.56
  const cleaned = val.trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function analyzeRows(headers: string[], rows: ParsedRow[]): SmartImportSummary {
  const errors: ValidationError[] = [];

  // Check required columns exist
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const missingCols = REQUIRED_COLUMNS.filter(c => !lowerHeaders.includes(c));
  if (missingCols.length > 0) {
    missingCols.forEach(c => errors.push({ row: 0, field: c, message: `Coluna obrigatória "${c}" não encontrada` }));
    return { grupos: [], totalItems: 0, validationErrors: errors, quinzenaColumns: [] };
  }

  // Find header name matching (case-insensitive)
  const findHeader = (target: string) => headers.find(h => h.toLowerCase().trim() === target) ?? target;

  // Detect quinzena columns
  const quinzenaColumns = headers.filter(h => /^Q\d+$/i.test(h.trim()));

  // Validate rows and group
  const grupoMap = new Map<string, { valorTotal: number; itemCount: number }>();

  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const grupo = row[findHeader('grupo')]?.trim();
    const item = row[findHeader('item')]?.trim();
    const apropriacao = row[findHeader('apropriacao')]?.trim();
    const valorStr = row[findHeader('valor_orcado')]?.trim();

    if (!grupo) errors.push({ row: rowNum, field: 'grupo', message: 'Grupo vazio' });
    if (!item) errors.push({ row: rowNum, field: 'item', message: 'Item vazio' });
    if (!apropriacao) errors.push({ row: rowNum, field: 'apropriacao', message: 'Apropriação vazia' });

    const valor = parseBRNumber(valorStr ?? '');
    if (valor === 0 && valorStr) {
      errors.push({ row: rowNum, field: 'valor_orcado', message: `Valor inválido: "${valorStr}"` });
    }

    if (grupo) {
      const existing = grupoMap.get(grupo) ?? { valorTotal: 0, itemCount: 0 };
      existing.valorTotal += valor;
      existing.itemCount += 1;
      grupoMap.set(grupo, existing);
    }
  });

  const grupos = Array.from(grupoMap.entries()).map(([nome, data]) => ({
    nome,
    valorTotal: data.valorTotal,
    itemCount: data.itemCount,
  }));

  return { grupos, totalItems: rows.length, validationErrors: errors, quinzenaColumns };
}

export function generateTemplate(): string {
  const headers = ['grupo', 'item', 'apropriacao', 'tipo', 'unidade', 'qtd_unit', 'qtd_total', 'custo_unitario', 'custo_casa', 'valor_orcado', 'Q1', 'Q2', 'Q3'];
  const example1 = ['FUNDAÇÃO', 'Estaca raiz', '1.1.01', 'MO', 'un', '12', '768', '45.00', '540.00', '34560.00', '10', '20', '30'];
  const example2 = ['ESTRUTURA', 'Forma', '2.1.01', 'MAT', 'm²', '8', '512', '30.00', '240.00', '15360.00', '5', '15', '25'];
  return [headers.join(';'), example1.join(';'), example2.join(';')].join('\n');
}

export function useSmartImport() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importBudget = useCallback(async (
    headers: string[],
    rows: ParsedRow[],
    clearExisting: boolean = false,
  ) => {
    if (!companyId) {
      toast.error('Empresa não selecionada');
      return { success: 0, errors: 0 };
    }

    const summary = analyzeRows(headers, rows);
    if (summary.validationErrors.some(e => REQUIRED_COLUMNS.includes(e.field) && e.row === 0)) {
      toast.error('Colunas obrigatórias ausentes');
      return { success: 0, errors: rows.length };
    }

    setImporting(true);
    setProgress(0);

    try {
      const findHeader = (target: string) => headers.find(h => h.toLowerCase().trim() === target) ?? target;

      // Step 0: Optionally clear existing data
      if (clearExisting) {
        await supabase.from('orcamento_items').delete().eq('company_id', companyId);
        await supabase.from('orcamento_grupos').delete().eq('company_id', companyId);
      }

      setProgress(10);

      // Step 1: Insert groups
      const grupoInserts = summary.grupos.map(g => ({
        company_id: companyId,
        nome: g.nome,
        valor_total: g.valorTotal,
      }));

      const { data: insertedGrupos, error: grupoError } = await supabase
        .from('orcamento_grupos')
        .insert(grupoInserts)
        .select('id, nome');

      if (grupoError || !insertedGrupos) {
        console.error('Group insert error:', grupoError);
        toast.error('Erro ao inserir grupos: ' + (grupoError?.message ?? 'unknown'));
        setImporting(false);
        setProgress(0);
        return { success: 0, errors: rows.length };
      }

      setProgress(30);

      // Build grupo name → id map
      const grupoIdMap: Record<string, string> = {};
      insertedGrupos.forEach(g => { grupoIdMap[g.nome.toLowerCase().trim()] = g.id; });

      // Step 2: Insert items in batches
      const BATCH = 50;
      let success = 0;
      let errors = 0;

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const mapped = batch.map(row => {
          const grupoNome = (row[findHeader('grupo')] ?? '').trim();
          const grupoId = grupoIdMap[grupoNome.toLowerCase()];

          // Build quinzenas JSONB
          const quinzenas: Record<string, number> = {};
          summary.quinzenaColumns.forEach(qCol => {
            const val = parseBRNumber(row[qCol] ?? '');
            if (val !== 0) quinzenas[qCol.toUpperCase()] = val;
          });

          return {
            company_id: companyId,
            grupo_id: grupoId ?? null,
            item: (row[findHeader('item')] ?? '').trim(),
            apropriacao: (row[findHeader('apropriacao')] ?? '').trim(),
            tipo: (row[findHeader('tipo')] ?? '').trim() || null,
            unidade: (row[findHeader('unidade')] ?? '').trim() || null,
            quantidade_unit: parseBRNumber(row[findHeader('qtd_unit')] ?? '') || null,
            quantidade_total: parseBRNumber(row[findHeader('qtd_total')] ?? '') || null,
            custo_unitario: parseBRNumber(row[findHeader('custo_unitario')] ?? '') || null,
            custo_casa: parseBRNumber(row[findHeader('custo_casa')] ?? '') || null,
            valor_orcado: parseBRNumber(row[findHeader('valor_orcado')] ?? ''),
            quinzenas: Object.keys(quinzenas).length > 0 ? quinzenas : null,
            fornecedor: (row[findHeader('fornecedor')] ?? '').trim() || null,
            forma_pagamento: (row[findHeader('forma_pagto')] ?? row[findHeader('forma_pagamento')] ?? '').trim() || null,
            parcelamento: (row[findHeader('parcelamento')] ?? '').trim() || null,
            observacoes: (row[findHeader('obs')] ?? row[findHeader('observacoes')] ?? row[findHeader('condição')] ?? '').trim() || null,
          };
        });

        const { error } = await supabase.from('orcamento_items').insert(mapped as never[]);
        if (error) {
          console.error('Item batch error:', error);
          errors += batch.length;
        } else {
          success += batch.length;
        }
        setProgress(30 + Math.round(((i + batch.length) / rows.length) * 70));
      }

      qc.invalidateQueries();

      // Refresh materialized view after budget import
      try {
        await supabase.rpc('refresh_materialized_views' as never);
      } catch (e) {
        console.warn('Could not refresh materialized views:', e);
      }

      if (errors === 0) {
        toast.success(`${summary.grupos.length} grupos e ${success} itens importados com sucesso`, {
          action: {
            label: 'Ver Dashboard',
            onClick: () => window.location.assign('/dashboard'),
          },
        });
      } else {
        toast.warning(`${success} itens importados, ${errors} com erro`);
      }

      return { success, errors };
    } catch (err) {
      console.error('Smart import error:', err);
      toast.error('Erro durante importação');
      return { success: 0, errors: rows.length };
    } finally {
      setImporting(false);
      setProgress(0);
    }
  }, [companyId, qc]);

  return { importBudget, importing, progress };
}
