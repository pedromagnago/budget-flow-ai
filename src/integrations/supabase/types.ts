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
        ]
      }
      categoria_depara: {
        Row: {
          apropriacao_excel: string
          ativo: boolean | null
          categoria_omie: string | null
          company_id: string
          created_at: string | null
          departamento_omie: string
          id: string
          match_automatico: boolean | null
          tipo_excel: string | null
        }
        Insert: {
          apropriacao_excel: string
          ativo?: boolean | null
          categoria_omie?: string | null
          company_id: string
          created_at?: string | null
          departamento_omie: string
          id?: string
          match_automatico?: boolean | null
          tipo_excel?: string | null
        }
        Update: {
          apropriacao_excel?: string
          ativo?: boolean | null
          categoria_omie?: string | null
          company_id?: string
          created_at?: string | null
          departamento_omie?: string
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
          motivo_rejeicao: string | null
          omie_lancamento_id: string | null
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
          motivo_rejeicao?: string | null
          omie_lancamento_id?: string | null
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
          motivo_rejeicao?: string | null
          omie_lancamento_id?: string | null
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
            foreignKeyName: "classificacoes_ia_omie_lancamento_id_fkey"
            columns: ["omie_lancamento_id"]
            isOneToOne: false
            referencedRelation: "omie_lancamentos"
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
      cronograma_servicos: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          nome: string
          preco_unitario: number | null
          quantidade: number | null
          valor_total: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          nome: string
          preco_unitario?: number | null
          quantidade?: number | null
          valor_total: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          preco_unitario?: number | null
          quantidade?: number | null
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
      medicoes: {
        Row: {
          company_id: string
          created_at: string | null
          data_fim: string
          data_inicio: string
          data_liberacao: string | null
          id: string
          numero: number
          observacoes: string | null
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
          id?: string
          numero: number
          observacoes?: string | null
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
          id?: string
          numero?: number
          observacoes?: string | null
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
        ]
      }
      medicoes_metas: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          medicao_numero: number
          meta_casas: number | null
          meta_percentual: number
          servico_id: string
          valor_liberado: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          medicao_numero: number
          meta_casas?: number | null
          meta_percentual: number
          servico_id: string
          valor_liberado?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          medicao_numero?: number
          meta_casas?: number | null
          meta_percentual?: number
          servico_id?: string
          valor_liberado?: number | null
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
        ]
      }
      omie_lancamentos: {
        Row: {
          categoria: string | null
          company_id: string
          conciliado: boolean | null
          conta_corrente: string | null
          created_at: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          deleted_at: string | null
          departamento: string | null
          departamento_limpo: string | null
          e_previsao: boolean | null
          fornecedor_cnpj: string | null
          fornecedor_razao: string | null
          grupo_omie: string | null
          id: string
          observacao: string | null
          omie_id: number | null
          omie_integracao_id: string | null
          orcamento_item_id: string | null
          origem: string | null
          parcela: string | null
          situacao: string | null
          synced_at: string | null
          tipo: string
          updated_at: string | null
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria?: string | null
          company_id: string
          conciliado?: boolean | null
          conta_corrente?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          e_previsao?: boolean | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          grupo_omie?: string | null
          id?: string
          observacao?: string | null
          omie_id?: number | null
          omie_integracao_id?: string | null
          orcamento_item_id?: string | null
          origem?: string | null
          parcela?: string | null
          situacao?: string | null
          synced_at?: string | null
          tipo: string
          updated_at?: string | null
          valor: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: string | null
          company_id?: string
          conciliado?: boolean | null
          conta_corrente?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          departamento_limpo?: string | null
          e_previsao?: boolean | null
          fornecedor_cnpj?: string | null
          fornecedor_razao?: string | null
          grupo_omie?: string | null
          id?: string
          observacao?: string | null
          omie_id?: number | null
          omie_integracao_id?: string | null
          orcamento_item_id?: string | null
          origem?: string | null
          parcela?: string | null
          situacao?: string | null
          synced_at?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "omie_lancamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omie_lancamentos_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
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
