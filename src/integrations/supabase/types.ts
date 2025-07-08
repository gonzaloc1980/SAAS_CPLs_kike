export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          numeros_whatsapp: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          id_grupo?: string | null
          nombre: string
          numeros_whatsapp?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          id_grupo?: string | null
          nombre?: string
          numeros_whatsapp?: string[]
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
          phone: string | null
          updated_at: string
          user_id: string
          vinculado: boolean
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          vinculado?: boolean
        }
        Update: {
          api_key?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          phone?: string | null
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
