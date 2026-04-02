import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { useEtapasHierarquicas } from '@/hooks/usePlanejamentoHierarquico';
import { toast } from 'sonner';

export interface PrevisaoProjetada {
  id: string; // orcamento_item.id or servico.id for items without breakdown
  tipo_ref: 'item' | 'servico';
  etapa_nome: string;
  servico_nome: string;
  item_nome: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  unidade: string;
  data_inicio_plan: string | null;
  dias_prazo_pagamento: number;
  data_vencimento_projetada: string | null;
  forma_pagamento_id: string | null;
  grupo_id: string;
  servico_id: string;
  orcamento_item_id: string | null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function usePrevisoesPlanejamento() {
  const { data: etapas, isLoading } = useEtapasHierarquicas();

  const previsoes = useMemo((): PrevisaoProjetada[] => {
    if (!etapas) return [];
    const result: PrevisaoProjetada[] = [];

    etapas.forEach(etapa => {
      etapa.servicos.forEach(servico => {
        if (servico.itens && servico.itens.length > 0) {
          servico.itens.forEach(item => {
            const qty = Number(item.quantidade_total) || 1;
            const unit = Number(item.custo_unitario) || 0;
            const valor = Number(item.valor_orcado) || qty * unit;
            const diasPrazo = Number(item.dias_prazo_pagamento) || 30;
            const dataInicio = (servico as any).data_inicio_plan ?? null;

            result.push({
              id: item.id,
              tipo_ref: 'item',
              etapa_nome: etapa.nome,
              servico_nome: servico.servico_nome ?? '',
              item_nome: item.item,
              fornecedor_id: item.fornecedor_id ?? null,
              fornecedor_nome: null,
              valor_unitario: unit,
              quantidade: qty,
              valor_total: valor,
              unidade: item.unidade ?? 'un',
              data_inicio_plan: dataInicio,
              dias_prazo_pagamento: diasPrazo,
              data_vencimento_projetada: dataInicio ? addDays(dataInicio, diasPrazo) : null,
              forma_pagamento_id: item.forma_pagamento_id ?? null,
              grupo_id: etapa.grupo_id,
              servico_id: servico.servico_id,
              orcamento_item_id: item.id,
            });
          });
        } else {
          // service without item breakdown
          const valor = Number(servico.servico_valor_original) || 0;
          const dataInicio = (servico as any).data_inicio_plan ?? null;
          result.push({
            id: servico.servico_id,
            tipo_ref: 'servico',
            etapa_nome: etapa.nome,
            servico_nome: servico.servico_nome ?? '',
            item_nome: servico.servico_nome ?? '',
            fornecedor_id: null,
            fornecedor_nome: null,
            valor_unitario: valor,
            quantidade: 1,
            valor_total: valor,
            unidade: 'sv',
            data_inicio_plan: dataInicio,
            dias_prazo_pagamento: 30,
            data_vencimento_projetada: dataInicio ? addDays(dataInicio, 30) : null,
            forma_pagamento_id: null,
            grupo_id: etapa.grupo_id,
            servico_id: servico.servico_id,
            orcamento_item_id: null,
          });
        }
      });
    });

    return result;
  }, [etapas]);

  return { previsoes, isLoading, etapas };
}

// Mutation: criar lançamento a partir de item do planejamento
export function useLancarPrevisao() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      tipo: 'despesa' | 'receita';
      valor: number;
      fornecedor_razao?: string;
      fornecedor_id?: string;
      data_vencimento?: string;
      departamento?: string;
      categoria?: string;
      orcamento_item_id?: string;
      forma_pagamento?: string;
      observacao?: string;
    }) => {
      const { error } = await supabase.from('lancamentos').insert({
        company_id: companyId!,
        tipo: input.tipo,
        valor: input.tipo === 'despesa' ? -Math.abs(input.valor) : Math.abs(input.valor),
        fornecedor_razao: input.fornecedor_razao ?? null,
        fornecedor_id: input.fornecedor_id ?? null,
        data_vencimento: input.data_vencimento ?? null,
        departamento: input.departamento ?? null,
        categoria: input.categoria ?? null,
        orcamento_item_id: input.orcamento_item_id ?? null,
        forma_pagamento: input.forma_pagamento ?? null,
        observacao: input.observacao ?? null,
        e_previsao: false,
        status_aprovacao: 'pendente',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos-status'] });
      qc.invalidateQueries({ queryKey: ['aprovacoes-lancamentos'] });
      qc.invalidateQueries({ queryKey: ['lancamentos-aprovados'] });
      toast.success('Lançamento criado — aguardando aprovação');
    },
    onError: () => toast.error('Erro ao criar lançamento'),
  });
}
