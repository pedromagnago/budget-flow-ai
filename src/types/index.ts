/**
 * ═══════════════════════════════════════════════════════════════
 * TIPOS DE NEGÓCIO — Budget Flow AI
 * ═══════════════════════════════════════════════════════════════
 * Tipos semânticos do domínio da aplicação.
 * Os tipos gerados do Supabase (Database) ficam em integrations/.
 * Aqui ficam as interfaces que o frontend realmente consome.
 * ═══════════════════════════════════════════════════════════════
 */

// ── Papéis e Acesso ──

export type UserRole = 'super_admin' | 'supervisor' | 'operador' | 'cliente';

// ── Status de Documentos ──

export type DocumentStatus =
  | 'recebido'
  | 'processando'
  | 'classificado'
  | 'aprovado'
  | 'corrigido'
  | 'rejeitado'
  | 'executado'
  | 'erro';

// ── Status de Medições ──

export type MedicaoStatus = 'no_prazo' | 'em_risco' | 'atrasada' | 'futura' | 'liberada';

// ── Status de Serviços ──

export type ServicoStatus = 'nao_iniciado' | 'em_andamento' | 'concluido' | 'atrasado' | 'pausado';

// ── Tipos de Lançamento ──

export type TipoLancamento = 'despesa' | 'receita';

// ── Categoria de Fornecedor ──

export type CategoriaFornecedor = 'material' | 'mao_de_obra' | 'servico' | 'locacao' | 'outro';

// ── Fornecedor ──

export interface Fornecedor {
  id: string;
  company_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  categoria: CategoriaFornecedor | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string | null;
}

// ── Orçamento ──

export interface OrcamentoGrupo {
  id: string;
  company_id: string;
  nome: string;
  valor_total: number;
  ativo: boolean;
}

export interface OrcamentoItem {
  id: string;
  company_id: string;
  grupo_id: string;
  item: string;
  apropriacao: string;
  tipo: string | null;
  unidade: string | null;
  quantidade_unit: number | null;
  quantidade_total: number | null;
  custo_unitario: number | null;
  custo_casa: number | null;
  valor_orcado: number;
  valor_consumido: number;
  valor_saldo: number;
  fornecedor_id: string | null;
  fornecedor: string | null;
  forma_pagamento: string | null;
  parcelamento: string | null;
  observacoes: string | null;
}

// ── Orçado vs Realizado ──

export interface OrcadoVsRealizado {
  grupo_id: string;
  grupo: string;
  valor_orcado: number;
  valor_consumido: number;
  valor_saldo: number;
  pct_consumido: number;
  itens_com_consumo: number;
  total_itens: number;
}

// ── Cronograma / Serviços ──

export interface ServicoSituacao {
  id: string;
  nome: string;
  codigo: string | null;
  grupo_id: string | null;
  orcamento_item_id: string | null;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  valor_total: number;
  responsavel: string | null;
  data_inicio_plan: string | null;
  data_fim_plan: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  status: string;
  ordem: number;
  situacao_calculada: string;
  dias_atraso: number;
}

// ── Medições ──

export interface MedicaoFinanceiro {
  id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_planejado: number;
  valor_liberado: number;
  status: string;
  data_real_liberacao: string | null;
  lancamento_receita_id: string | null;
  previsao_liberacao: string | null;
  status_financeiro: string;
}

// ── Lançamentos Financeiros ──

export interface LancamentoStatus {
  id: string;
  company_id: string;
  tipo: string;
  valor: number;
  valor_pago: number;
  fornecedor_razao: string | null;
  fornecedor_cnpj: string | null;
  departamento: string | null;
  departamento_limpo: string | null;
  categoria: string | null;
  observacao: string | null;
  parcela: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  data_vencimento: string | null;
  data_emissao: string | null;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  e_previsao: boolean | null;
  conciliado: boolean | null;
  situacao: string | null;
  quinzena: string | null;
  orcamento_item_id: string | null;
  conta_bancaria_id: string | null;
  movimentacao_id: string | null;
  status_aprovacao: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
  status_calculado: string | null;
  dias_ate_vencimento: number | null;
  created_at: string | null;
}

// ── Impactos Físico-Financeiro ──

export interface ImpactoFisicoFinanceiro {
  id: string;
  company_id: string;
  tipo: string;
  servico_id: string | null;
  medicao_id: string | null;
  descricao: string | null;
  desvio_dias: number | null;
  desvio_percentual: number | null;
  impacto_financeiro: number | null;
  acao_tomada: string;
  resolvido: boolean;
  created_at: string;
}

// ── Etapa Completa (view cruzada) ──

export interface EtapaCompleta {
  grupo_id: string;
  company_id: string;
  etapa_nome: string;
  etapa_valor_orcado: number;
  total_itens: number;
  soma_orcado_itens: number;
  soma_consumido_itens: number;
  soma_saldo_itens: number;
  total_servicos: number;
  servicos_concluidos: number;
  servicos_atrasados: number;
  total_lancamentos: number;
  valor_total_lancamentos: number;
  valor_pago_lancamentos: number;
  lancamentos_pendentes: number;
  lancamentos_vencidos: number;
  total_fornecedores: number;
  pct_consumido: number;
  pct_fisico_concluido: number;
}

// ── Fornecedor Resumo (view) ──

export interface FornecedorResumo {
  fornecedor_id: string;
  company_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  categoria: string | null;
  total_itens_orcamento: number;
  valor_total_orcado: number;
  total_lancamentos: number;
  valor_total_lancamentos: number;
  valor_total_pago: number;
  lancamentos_pendentes: number;
  lancamentos_vencidos: number;
}

// ── Trigger Results (avanço físico) ──

export interface TriggerResult {
  type: 'delay_detected' | 'early_completion' | 'partial_measurement' | 'none';
  servicoNome?: string;
  desvioPercent?: number;
  diasDesvio?: number;
  lancamentosAfetados?: number;
  diasAdiantamento?: number;
  diferenca?: number;
}

// ── Planejamento Hierárquico (Etapa → Serviço → Item) ──

export interface ItemPlanejamento {
  id: string;
  company_id: string;
  grupo_id: string;
  servico_id: string | null;
  item: string;
  apropriacao: string;
  unidade: string | null;
  quantidade_total: number | null;
  custo_unitario: number | null;
  valor_orcado: number;
  valor_consumido: number;
  valor_saldo: number;
  fornecedor_id: string | null;
  fornecedor: string | null;
  forma_pagamento_id: string | null;
  forma_pagamento: string | null;
  dias_prazo_pagamento: number | null;
  observacoes: string | null;
}

export interface ServicoComItens {
  servico_id: string;
  company_id: string;
  grupo_id: string | null;
  servico_nome: string;
  codigo: string | null;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  servico_valor_original: number;
  responsavel: string | null;
  data_inicio_plan: string | null;
  data_fim_plan: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  status: string | null;
  ordem: number | null;
  servico_fornecedor_id: string | null;
  servico_forma_pagamento_id: string | null;
  total_itens: number;
  soma_itens_orcado: number;
  soma_itens_consumido: number;
  soma_itens_saldo: number;
  itens: ItemPlanejamento[];
}

export interface EtapaHierarquica {
  grupo_id: string;
  company_id: string;
  nome: string;
  valor_total: number;
  servicos: ServicoComItens[];
  total_servicos: number;
  soma_total_itens: number;
}

export interface FluxoProjetadoEntry {
  mes: string;
  valor: number;
  itens: Array<{
    item: string;
    servico: string;
    etapa: string;
    valor: number;
    fornecedor: string | null;
    forma_pagamento: string | null;
    data_projetada: string;
  }>;
}
