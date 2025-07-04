export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contact_requests: {
        Row: {
          correo: string
          created_at: string
          estado: string
          id: string
          mensaje: string | null
          nombre: string
          whatsapp: string
        }
        Insert: {
          correo: string
          created_at?: string
          estado?: string
          id?: string
          mensaje?: string | null
          nombre: string
          whatsapp: string
        }
        Update: {
          correo?: string
          created_at?: string
          estado?: string
          id?: string
          mensaje?: string | null
          nombre?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cpls: {
        Row: {
          audio_texto: string | null
          audio_url: string | null
          created_at: string
          destinatario_persona_grupo: string | null
          dia_semana: string
          fecha_inicio: string
          fecha_termino: string
          hora: string
          id: string
          imagen_texto: string | null
          imagen_url: string | null
          mensaje_x_dia: string | null
          texto_video: string | null
          tipo_cpl: string[]
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          audio_texto?: string | null
          audio_url?: string | null
          created_at?: string
          destinatario_persona_grupo?: string | null
          dia_semana: string
          fecha_inicio: string
          fecha_termino: string
          hora: string
          id?: string
          imagen_texto?: string | null
          imagen_url?: string | null
          mensaje_x_dia?: string | null
          texto_video?: string | null
          tipo_cpl: string[]
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          audio_texto?: string | null
          audio_url?: string | null
          created_at?: string
          destinatario_persona_grupo?: string | null
          dia_semana?: string
          fecha_inicio?: string
          fecha_termino?: string
          hora?: string
          id?: string
          imagen_texto?: string | null
          imagen_url?: string | null
          mensaje_x_dia?: string | null
          texto_video?: string | null
          tipo_cpl?: string[]
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          created_at: string
          estado: string
          id: string
          id_grupo: string | null
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          id_grupo?: string | null
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          id_grupo?: string | null
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          created_at: string
          id: string
          nombre: string | null
          updated_at: string
          user_id: string
          vinculado: boolean
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id: string
          vinculado?: boolean
        }
        Update: {
          api_key?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id?: string
          vinculado?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
