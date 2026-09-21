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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cash_dues: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      cash_expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          spent_on: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          spent_on?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          spent_on?: string
        }
        Relationships: []
      }
      cash_payments: {
        Row: {
          created_at: string
          due_id: string
          id: string
          paid_at: string
          student_id: string
        }
        Insert: {
          created_at?: string
          due_id: string
          id?: string
          paid_at?: string
          student_id: string
        }
        Update: {
          created_at?: string
          due_id?: string
          id?: string
          paid_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_payments_due_id_fkey"
            columns: ["due_id"]
            isOneToOne: false
            referencedRelation: "cash_dues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          order_index: number
          poll_id: string
        }
        Insert: {
          id?: string
          label: string
          order_index?: number
          poll_id: string
        }
        Update: {
          id?: string
          label?: string
          order_index?: number
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          created_at: string
          description: string | null
          id: string
          is_open: boolean
          title: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_open?: boolean
          title: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_open?: boolean
          title?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          show_countdown: boolean
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          show_countdown?: boolean
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          show_countdown?: boolean
          title?: string
        }
        Relationships: []
      }
      org_positions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          parent_id: string | null
          photo_url: string | null
          student_id: string | null
          student_name: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          parent_id?: string | null
          photo_url?: string | null
          student_id?: string | null
          student_name?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          parent_id?: string | null
          photo_url?: string | null
          student_id?: string | null
          student_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_positions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_positions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      piket_assignments: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piket_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_entries: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject: string
          teacher: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject: string
          teacher?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject?: string
          teacher?: string | null
        }
        Relationships: []
      }
      student_accounts: {
        Row: {
          created_at: string
          student_id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          student_id: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          student_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          full_name: string
          gender: string | null
          id: string
          nickname: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          nickname?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          nickname?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_anonymous: boolean
          is_read: boolean
          message: string
          student_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_read?: boolean
          message: string
          student_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_read?: boolean
          message?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cash_summary: {
        Args: never
        Returns: { total_in: number; total_out: number }[]
      }
      current_student_id: { Args: never; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      poll_results: {
        Args: { _poll_id: string }
        Returns: { option_id: string; votes: number }[]
      }
      update_my_profile: {
        Args: { _nickname: string; _photo_url: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
