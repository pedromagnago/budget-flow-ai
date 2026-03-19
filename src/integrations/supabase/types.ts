export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ajustes_saldo: {
        Row: {
          company_id: string
          conta_id: string
          created_at: string | null
          created_by: string | null
          data: string
          diferenca: number | null
          id: string
          motivo: string
          saldo_anterior: number
          saldo_correto: number
        }
        Insert: {
          company_id: string
          conta_id: string
          created_at?: string | null
          created_by?: string | null
          data: string
          diferenca?: number | null
          id?: string
          motivo: string
          saldo_anterior: number
          saldo_correto: number
        }
        Update: {
          company_id?: string
          conta_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          diferenca?: number | null
          id?: string
          motivo?: string
          saldo_anterior?: number
          saldo_correto?: number
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_saldo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_saldo_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_saldo_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          lido: boolean | null
          lido_em: string | null
          lido_por: string | null
          mensagem: string | null
          severidade: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          lido_por?: string | null
          mensagem?: string | null
          severidade?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          lido_por?: string | null
          mensagem?: string | null
          severidade?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          agente: string | null
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          agente?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          agente?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      avanco_fisico: {
        Row: {
          casas_concluidas: number
          company_id: string
          created_at: string | null
          data_registro: string
          fotos: string[] | null
          id: string
          observacoes: string | null
          percentual_real: number | null
          registrado_por: string | null
          servico_id: string
        }
        Insert: {
          casas_concluidas?: number
          company_id: string
          created_at?: string | null
          data_registro?: string
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          percentual_real?: number | null
          registrado_por?: string | null
          servico_id: string
        }
        Update: {
          casas_concluidas?: number
          company_id?: string
          created_at?: string | null
          data_registro?: string
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          percentual_real?: number | null
          registrado_por?: string | null
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avanco_fisico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avanco_fisico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "cronograma_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avanco_fisico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "vw_servicos_situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      avancos_obra: {
        Row: {
          casas_concluidas: number
          company_id: string
          created_at: string | null
          created_by: string | null
          data_registro: string
          foto_urls: string[] | null
          id: string
          medicao_numero: number
          observacao: string | null
          percentual: number
          responsavel: string | null
          servico_id: string
        }
        Insert: {
          casas_concluidas?: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          data_registro?: string
          foto_urls?: string[] | null
          id?: string
          medicao_numero: number
          observacao?: string | null
          percentual: number
          responsavel?: string | null
          servico_id: string
        }
        Update: {
          casas_concluidas?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          data_registro?: string
          foto_urls?: string[] | null
          id?: string
          medicao_numero?: number
          observacao?: string | null
          percentual?: number
          responsavel?: string | null
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avancos_obra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avancos_obra_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "cronograma_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avancos_obra_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "vw_servicos_situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_depara: {
        Row: {
          apropriacao: string
          ativo: boolean | null
          company_id: string
          created_at: string | null
          departamento: string
          id: string
          match_automatico: boolean | null
          tipo_excel: string | null
        }
        Insert: {
          apropriacao: string
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          departamento: string
          id?: string
          match_automatico?: boolean | null
          tipo_excel?: string | null
        }
        Update: {
          apropriacao?: string
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          departamento?: string
          id?: string
          match_automatico?: boolean | null
          tipo_excel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categoria_depara_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cenario_ajustes: {
        Row: {
          campo_alterado: string | null
          cenario_id: string
          company_id: string
          created_at: string | null
          id: string
          justificativa: string | null
          parcelas: Json | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo_ajuste: string
          valor_novo: string | null
          valor_original: string | null
        }
        Insert: {
          campo_alterado?: string | null
          cenario_id: string
          company_id: string
          created_at?: string | null
          id?: string
          justificativa?: string | null
          parcelas?: Json | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_ajuste: string
          valor_novo?: string | null
          valor_original?: string | null
        }
        Update: {
          campo_alterado?: string | null
          cenario_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          justificativa?: string | null
          parcelas?: Json | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_ajuste?: string
          valor_novo?: string | null
          valor_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cenario_ajustes_cenario_id_fkey"
            columns: ["cenario_id"]
            isOneToOne: false
            referencedRelation: "cenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cenario_ajustes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cenarios: {
        Row: {
          ativo: boolean | null
          company_id: string
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      classificacoes_ia: {
        Row: {
          auditado_em: string | null
          auditado_por: string | null
          categoria_proposta: string | null
          cnpj_extraido: string | null
          company_id: string
          correcoes: Json | null
          created_at: string | null
          data_vencimento_ext: string | null
          departamento_proposto: string | null
          documento_id: string
          fornecedor_extraido: string | null
          grupo_proposto: string | null
          id: string
          itens_extraidos: Json | null
          justificativa_ia: string | null
          lancamento_id: string | null
          motivo_rejeicao: string | null
          orcamento_item_id: string | null
          score_confianca: number | null
          status_auditoria: string | null
          updated_at: string | null
          valor_extraido: number | null
          valor_ja_consumido: number | null
          valor_orcado_item: number | null
          valor_saldo_antes: number | null
          valor_saldo_depois: number | null
        }
        Insert: {
          auditado_em?: string | null
          auditado_por?: string | null
          categoria_proposta?: string | null
          cnpj_extraido?: string | null
          company_id: string
          correcoes?: Json | null
          created_at?: string | null
          data_vencimento_ext?: string | null
          departamento_proposto?: string | null
          documento_id: string
          fornecedor_extraido?: string | null
          grupo_proposto?: string | null
          id?: string
          itens_extraidos?: Json | null
          justificativa_ia?: string | null
          lancamento_id?: string | null
          motivo_rejeicao?: string | null
          orcamento_item_id?: string | null
          score_confianca?: number | null
          status_auditoria?: string | null
          updated_at?: string | null
          valor_extraido?: number | null
          valor_ja_consumido?: number | null
          valor_orcado_item?: number | null
          valor_saldo_antes?: number | null
          valor_saldo_depois?: number | null
        }
        Update: {
          auditado_em?: string | null
          auditado_por?: string | null
          categoria_proposta?: string | null
          cnpj_extraido?: string | null
          company_id?: string
          correcoes?: Json | null
          created_at?: string | null
          data_vencimento_ext?: string | null
          departamento_proposto?: string | null
          documento_id?: string
          fornecedor_extraido?: string | null
          grupo_proposto?: string | null
          id?: string
          itens_extraidos?: Json | null
          justificativa_ia?: string | null
          lancamento_id?: string | null
          motivo_rejeicao?: string | null
          orcamento_item_id?: string | null
          score_confianca?: number | null
          status_auditoria?: string | null
          updated_at?: string | null
          valor_extraido?: number | null
          valor_ja_consumido?: number | null
          valor_orcado_item?: number | null
          valor_saldo_antes?: number | null
          valor_saldo_depois?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classificacoes_ia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_ia_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_ia_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_ia_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_ia_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          config: Json | null
          created_at: string | null
          estado: string | null
          id: string
          municipio: string | null
          nome_fantasia: string | null
          qtd_casas: number | null
          razao_social: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          config?: Json | null
          created_at?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nome_fantasia?: string | null
          qtd_casas?: number | null
          razao_social: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          config?: Json | null
          created_at?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nome_fantasia?: string | null
          qtd_casas?: number | null
          razao_social?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string
          company_id: string
          conta: string | null
          created_at: string | null
          data_saldo_inicial: string
          id: string
          nome: string
          saldo_inicial: number
          tipo: string
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco: string
          company_id: string
          conta?: string | null
          created_at?: string | null
          data_saldo_inicial: string
          id?: string
          nome: string
          saldo_inicial?: number
          tipo: string
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string
          company_id?: string
          conta?: string | null
          created_at?: string | null
          data_saldo_inicial?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_servicos: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          company_id: string
          created_at: string | null
          data_fim_plan: string | null
          data_fim_real: string | null
          data_inicio_plan: string | null
          data_inicio_real: string | null
          depende_de: string | null
          descricao: string | null
          grupo_id: string | null
          id: string
          nome: string
          observacao: string | null
          ordem: number | null
          preco_unitario: number | null
          quantidade: number | null
          responsavel: string | null
          status: string | null
          unidade: string | null
          valor_total: number
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          company_id: string
          created_at?: string | null
          data_fim_plan?: string | null
          data_fim_real?: string | null
          data_inicio_plan?: string | null
          data_inicio_real?: string | null
          depende_de?: string | null
          descricao?: string | null
          grupo_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          responsavel?: string | null
          status?: string | null
          unidade?: string | null
          valor_total: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          company_id?: string
          created_at?: string | null
          data_fim_plan?: string | null
          data_fim_real?: string | null
          data_inicio_plan?: string | null
          data_inicio_real?: string | null
          depende_de?: string | null
          descricao?: string | null
          grupo_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          responsavel?: string | null
          status?: string | null
          unidade?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_servicos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_depende_de_fkey"
            columns: ["depende_de"]
            isOneToOne: false
            referencedRelation: "cronograma_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_depende_de_fkey"
            columns: ["depende_de"]
            isOneToOne: false
            referencedRelation: "vw_servicos_situacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "orcamento_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "v_orcado_vs_realizado"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      documentos: {
        Row: {
          company_id: string
          created_at: string | null
          enviado_por: string | null
          erro_detalhe: string | null
          id: string
          nome_arquivo: string
          status: string | null
          storage_path: string
          tamanho_bytes: number | null
          tipo_mime: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          enviado_por?: string | null
          erro_detalhe?: string | null
          id?: string
          nome_arquivo: string
          status?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          enviado_por?: string | null
          erro_detalhe?: string | null
          id?: string
          nome_arquivo?: string
          status?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      impactos_fisico_financeiro: {
        Row: {
          acao_tomada: string | null
          company_id: string
          created_at: string | null
          descricao: string | null
          desvio_dias: number | null
          desvio_percentual: number | null
          id: string
          impacto_financeiro: number | null
          lancamento_id: string | null
          medicao_id: string | null
          medicao_numero: number | null
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          servico_id: string | null
          tipo: string
          valor_impacto: number | null
        }
        Insert: {
          acao_tomada?: string | null
          company_id: string
          created_at?: string | null
          descricao?: string | null
          desvio_dias?: number | null
          desvio_percentual?: number | null
          id?: string
          impacto_financeiro?: number | null
          lancamento_id?: string | null
          medicao_id?: string | null
          medicao_numero?: number | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          servico_id?: string | null
          tipo: string
          valor_impacto?: number | null
        }
        Update: {
          acao_tomada?: string | null
          company_id?: string
          created_at?: string | null
          descricao?: string | null
          desvio_dias?: number | null
          desvio_percentual?: number | null
          id?: string
          impacto_financeiro?: number | null
          lancamento_id?: string | null
          medicao_id?: string | null
          medicao_numero?: number | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          servico_id?: string | null
          tipo?: string
          valor_impacto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impactos_fisico_financeiro_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "vw_medicoes_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "cronograma_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impactos_fisico_financeiro_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "vw_servicos_situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          categoria: string | null
          company_id: string
          conciliado: boolean | null
          conta_bancaria_id: string | null
          created_at: string | null
          created_by: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          deleted_at: string | null
          departamento: string | null
          departamento_limpo: string | null
          e_previsao: boolean | null
          forma_pagamento: string | null
          fornecedor_cnpj: string | null
          fornecedor_razao: string | null
          id: string
          movimentacao_id: string | null
          notificacao_enviada: boolean | null
          notificado_em: string | null
          numero_parcela: number | null
          observacao: string | null
          orcamento_item_id: string | null
          parcela: string | null
          quinzena: string | null
          situacao: string | null
          tipo: string
          total_parcelas: number | null
          updated_at: string | null
          updated_by: string | null
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria?: string | null
          company_id: string
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          e_previsao?: boolean | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          id?: string
          movimentacao_id?: string | null
          notificacao_enviada?: boolean | null
          notificado_em?: string | null
          numero_parcela?: number | null
          observacao?: string | null
          orcamento_item_id?: string | null
          parcela?: string | null
          quinzena?: string | null
          situacao?: string | null
          tipo: string
          total_parcelas?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: string | null
          company_id?: string
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          e_previsao?: boolean | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          id?: string
          movimentacao_id?: string | null
          notificacao_enviada?: boolean | null
          notificado_em?: string | null
          numero_parcela?: number | null
          observacao?: string | null
          orcamento_item_id?: string | null
          parcela?: string | null
          quinzena?: string | null
          situacao?: string | null
          tipo?: string
          total_parcelas?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes: {
        Row: {
          company_id: string
          created_at: string | null
          data_fim: string
          data_inicio: string
          data_liberacao: string | null
          data_real_liberacao: string | null
          id: string
          lancamento_receita_id: string | null
          numero: number
          observacoes: string | null
          percentual_fisico_meta: number | null
          percentual_fisico_real: number | null
          previsao_liberacao: string | null
          status: string | null
          updated_at: string | null
          valor_liberado: number | null
          valor_planejado: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_fim: string
          data_inicio: string
          data_liberacao?: string | null
          data_real_liberacao?: string | null
          id?: string
          lancamento_receita_id?: string | null
          numero: number
          observacoes?: string | null
          percentual_fisico_meta?: number | null
          percentual_fisico_real?: number | null
          previsao_liberacao?: string | null
          status?: string | null
          updated_at?: string | null
          valor_liberado?: number | null
          valor_planejado: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          data_liberacao?: string | null
          data_real_liberacao?: string | null
          id?: string
          lancamento_receita_id?: string | null
          numero?: number
          observacoes?: string | null
          percentual_fisico_meta?: number | null
          percentual_fisico_real?: number | null
          previsao_liberacao?: string | null
          status?: string | null
          updated_at?: string | null
          valor_liberado?: number | null
          valor_planejado?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_lancamento_receita_id_fkey"
            columns: ["lancamento_receita_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_lancamento_receita_id_fkey"
            columns: ["lancamento_receita_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes_metas: {
        Row: {
          casas_concluidas: number | null
          company_id: string
          created_at: string | null
          data_registro: string | null
          id: string
          medicao_numero: number
          meta_casas: number | null
          meta_percentual: number
          observacao: string | null
          percentual_real: number | null
          registrado_por: string | null
          servico_id: string
          valor_liberado: number | null
          valor_previsto: number | null
        }
        Insert: {
          casas_concluidas?: number | null
          company_id: string
          created_at?: string | null
          data_registro?: string | null
          id?: string
          medicao_numero: number
          meta_casas?: number | null
          meta_percentual: number
          observacao?: string | null
          percentual_real?: number | null
          registrado_por?: string | null
          servico_id: string
          valor_liberado?: number | null
          valor_previsto?: number | null
        }
        Update: {
          casas_concluidas?: number | null
          company_id?: string
          created_at?: string | null
          data_registro?: string | null
          id?: string
          medicao_numero?: number
          meta_casas?: number | null
          meta_percentual?: number
          observacao?: string | null
          percentual_real?: number | null
          registrado_por?: string | null
          servico_id?: string
          valor_liberado?: number | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_metas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_metas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "cronograma_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_metas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "vw_servicos_situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_bancarias: {
        Row: {
          categoria: string | null
          company_id: string
          conciliado: boolean | null
          conciliado_em: string | null
          conciliado_por: string | null
          conta_id: string
          created_at: string | null
          created_by: string | null
          data: string
          descricao: string
          documento: string | null
          fornecedor: string | null
          grupo_id: string | null
          id: string
          item_id: string | null
          lancamento_id: string | null
          observacao: string | null
          tipo: string
          transferencia_id: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          company_id: string
          conciliado?: boolean | null
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_id: string
          created_at?: string | null
          created_by?: string | null
          data: string
          descricao: string
          documento?: string | null
          fornecedor?: string | null
          grupo_id?: string | null
          id?: string
          item_id?: string | null
          lancamento_id?: string | null
          observacao?: string | null
          tipo: string
          transferencia_id?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          company_id?: string
          conciliado?: boolean | null
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          descricao?: string
          documento?: string | null
          fornecedor?: string | null
          grupo_id?: string | null
          id?: string
          item_id?: string | null
          lancamento_id?: string | null
          observacao?: string | null
          tipo?: string
          transferencia_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "orcamento_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "v_orcado_vs_realizado"
            referencedColumns: ["grupo_id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          lancamento_id: string | null
          lida: boolean | null
          lida_em: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          lancamento_id?: string | null
          lida?: boolean | null
          lida_em?: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          lancamento_id?: string | null
          lida?: boolean | null
          lida_em?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_grupos: {
        Row: {
          ativo: boolean | null
          company_id: string
          created_at: string | null
          id: string
          nome: string
          valor_total: number
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          nome: string
          valor_total: number
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_grupos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_items: {
        Row: {
          apropriacao: string
          ativo: boolean | null
          company_id: string
          created_at: string | null
          custo_casa: number | null
          custo_unitario: number | null
          forma_pagamento: string | null
          fornecedor: string | null
          grupo_id: string
          id: string
          item: string
          linha_origem: number | null
          observacoes: string | null
          parcelamento: string | null
          quantidade_total: number | null
          quantidade_unit: number | null
          quinzenas: Json | null
          tipo: string | null
          unidade: string | null
          updated_at: string | null
          valor_consumido: number | null
          valor_orcado: number
          valor_saldo: number | null
        }
        Insert: {
          apropriacao: string
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          custo_casa?: number | null
          custo_unitario?: number | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          grupo_id: string
          id?: string
          item: string
          linha_origem?: number | null
          observacoes?: string | null
          parcelamento?: string | null
          quantidade_total?: number | null
          quantidade_unit?: number | null
          quinzenas?: Json | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_consumido?: number | null
          valor_orcado: number
          valor_saldo?: number | null
        }
        Update: {
          apropriacao?: string
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          custo_casa?: number | null
          custo_unitario?: number | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          grupo_id?: string
          id?: string
          item?: string
          linha_origem?: number | null
          observacoes?: string | null
          parcelamento?: string | null
          quantidade_total?: number | null
          quantidade_unit?: number | null
          quinzenas?: Json | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
          valor_consumido?: number | null
          valor_orcado?: number
          valor_saldo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_items_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "orcamento_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_items_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "v_orcado_vs_realizado"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_orcado_vs_realizado: {
        Row: {
          company_id: string | null
          grupo: string | null
          grupo_id: string | null
          itens_com_consumo: number | null
          pct_consumido: number | null
          total_itens: number | null
          valor_consumido: number | null
          valor_orcado: number | null
          valor_saldo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_grupos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_lancamentos_status: {
        Row: {
          categoria: string | null
          company_id: string | null
          conciliado: boolean | null
          conta_bancaria_id: string | null
          created_at: string | null
          created_by: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          deleted_at: string | null
          departamento: string | null
          departamento_limpo: string | null
          dias_ate_vencimento: number | null
          e_previsao: boolean | null
          forma_pagamento: string | null
          fornecedor_cnpj: string | null
          fornecedor_razao: string | null
          id: string | null
          movimentacao_id: string | null
          notificacao_enviada: boolean | null
          notificado_em: string | null
          numero_parcela: number | null
          observacao: string | null
          orcamento_item_id: string | null
          parcela: string | null
          quinzena: string | null
          situacao: string | null
          status_calculado: string | null
          tipo: string | null
          total_parcelas: number | null
          updated_at: string | null
          updated_by: string | null
          valor: number | null
          valor_pago: number | null
        }
        Insert: {
          categoria?: string | null
          company_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          dias_ate_vencimento?: never
          e_previsao?: boolean | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          id?: string | null
          movimentacao_id?: string | null
          notificacao_enviada?: boolean | null
          notificado_em?: string | null
          numero_parcela?: number | null
          observacao?: string | null
          orcamento_item_id?: string | null
          parcela?: string | null
          quinzena?: string | null
          situacao?: string | null
          status_calculado?: never
          tipo?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: number | null
          valor_pago?: number | null
        }
        Update: {
          categoria?: string | null
          company_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          dias_ate_vencimento?: never
          e_previsao?: boolean | null
          forma_pagamento?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          id?: string | null
          movimentacao_id?: string | null
          notificacao_enviada?: boolean | null
          notificado_em?: string | null
          numero_parcela?: number | null
          observacao?: string | null
          orcamento_item_id?: string | null
          parcela?: string | null
          quinzena?: string | null
          situacao?: string | null
          status_calculado?: never
          tipo?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_medicoes_financeiro: {
        Row: {
          company_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          data_liberacao: string | null
          data_real_liberacao: string | null
          id: string | null
          lancamento_receita_id: string | null
          numero: number | null
          observacoes: string | null
          previsao_liberacao: string | null
          status: string | null
          status_financeiro: string | null
          updated_at: string | null
          valor_liberado: number | null
          valor_planejado: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_liberacao?: string | null
          data_real_liberacao?: string | null
          id?: string | null
          lancamento_receita_id?: string | null
          numero?: number | null
          observacoes?: string | null
          previsao_liberacao?: string | null
          status?: string | null
          status_financeiro?: never
          updated_at?: string | null
          valor_liberado?: number | null
          valor_planejado?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_liberacao?: string | null
          data_real_liberacao?: string | null
          id?: string | null
          lancamento_receita_id?: string | null
          numero?: number | null
          observacoes?: string | null
          previsao_liberacao?: string | null
          status?: string | null
          status_financeiro?: never
          updated_at?: string | null
          valor_liberado?: number | null
          valor_planejado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_lancamento_receita_id_fkey"
            columns: ["lancamento_receita_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_lancamento_receita_id_fkey"
            columns: ["lancamento_receita_id"]
            isOneToOne: false
            referencedRelation: "vw_lancamentos_status"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_saldo_contas: {
        Row: {
          ativo: boolean | null
          banco: string | null
          company_id: string | null
          data_saldo_inicial: string | null
          id: string | null
          movimentacoes_total: number | null
          nome: string | null
          pendentes_conciliacao: number | null
          saldo_atual: number | null
          saldo_inicial: number | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_servicos_situacao: {
        Row: {
          codigo: string | null
          company_id: string | null
          created_at: string | null
          data_fim_plan: string | null
          data_fim_real: string | null
          data_inicio_plan: string | null
          data_inicio_real: string | null
          dias_atraso: number | null
          grupo_id: string | null
          id: string | null
          nome: string | null
          ordem: number | null
          preco_unitario: number | null
          quantidade: number | null
          responsavel: string | null
          situacao_calculada: string | null
          status: string | null
          unidade: string | null
          valor_total: number | null
        }
        Insert: {
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          data_fim_plan?: string | null
          data_fim_real?: string | null
          data_inicio_plan?: string | null
          data_inicio_real?: string | null
          dias_atraso?: never
          grupo_id?: string | null
          id?: string | null
          nome?: string | null
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          responsavel?: string | null
          situacao_calculada?: never
          status?: string | null
          unidade?: string | null
          valor_total?: number | null
        }
        Update: {
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          data_fim_plan?: string | null
          data_fim_real?: string | null
          data_inicio_plan?: string | null
          data_inicio_real?: string | null
          dias_atraso?: never
          grupo_id?: string | null
          id?: string | null
          nome?: string | null
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          responsavel?: string | null
          situacao_calculada?: never
          status?: string | null
          unidade?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_servicos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "orcamento_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_servicos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "v_orcado_vs_realizado"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
    }
    Functions: {
      get_orcado_vs_realizado: {
        Args: { _company_id: string }
        Returns: {
          grupo: string
          grupo_id: string
          itens_com_consumo: number
          pct_consumido: number
          total_itens: number
          valor_consumido: number
          valor_orcado: number
          valor_saldo: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
          role: string
        }[]
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      user_can_access_company: {
        Args: { cid: string; uid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
