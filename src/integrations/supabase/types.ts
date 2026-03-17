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
          grupo_id: string
          id: string
          item: string
          linha_origem: number | null
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
          grupo_id: string
          id?: string
          item: string
          linha_origem?: number | null
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
          grupo_id?: string
          id?: string
          item?: string
          linha_origem?: number | null
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
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
          role: string
        }[]
      }
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
