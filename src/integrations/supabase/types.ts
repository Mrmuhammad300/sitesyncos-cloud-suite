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
      budgets: {
        Row: {
          allocated: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          fiscal_year: string | null
          id: string
          project_id: string | null
          spent: number
          status: string
          updated_at: string
        }
        Insert: {
          allocated?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: string | null
          id?: string
          project_id?: string | null
          spent?: number
          status?: string
          updated_at?: string
        }
        Update: {
          allocated?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_year?: string | null
          id?: string
          project_id?: string | null
          spent?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          co_number: string
          created_at: string
          days_impact: number
          id: string
          project_id: string | null
          reason: string | null
          requested_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          co_number: string
          created_at?: string
          days_impact?: number
          id?: string
          project_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          co_number?: string
          created_at?: string
          days_impact?: number
          id?: string
          project_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          assignee: string | null
          category: string
          created_at: string
          due_date: string | null
          id: string
          last_checked: string | null
          project_id: string | null
          requirement: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          category: string
          created_at?: string
          due_date?: string | null
          id?: string
          last_checked?: string | null
          project_id?: string | null
          requirement: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          last_checked?: string | null
          project_id?: string | null
          requirement?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          activities: string[] | null
          author_name: string | null
          author_user: string | null
          created_at: string
          crew_count: number
          delay_hours: number
          id: string
          project_id: string | null
          report_date: string
          report_number: string
          safety_incidents: number
          summary: string | null
          temp_high: number | null
          temp_low: number | null
          updated_at: string
          weather: string | null
          work_hours: number
        }
        Insert: {
          activities?: string[] | null
          author_name?: string | null
          author_user?: string | null
          created_at?: string
          crew_count?: number
          delay_hours?: number
          id?: string
          project_id?: string | null
          report_date?: string
          report_number: string
          safety_incidents?: number
          summary?: string | null
          temp_high?: number | null
          temp_low?: number | null
          updated_at?: string
          weather?: string | null
          work_hours?: number
        }
        Update: {
          activities?: string[] | null
          author_name?: string | null
          author_user?: string | null
          created_at?: string
          crew_count?: number
          delay_hours?: number
          id?: string
          project_id?: string | null
          report_date?: string
          report_number?: string
          safety_incidents?: number
          summary?: string | null
          temp_high?: number | null
          temp_low?: number | null
          updated_at?: string
          weather?: string | null
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          doc_number: string
          doc_type: string
          file_size: string | null
          file_url: string | null
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          doc_number: string
          doc_type?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          doc_number?: string
          doc_type?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_requests: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          description: string | null
          draw_number: string
          id: string
          project_id: string | null
          requested_by: string | null
          status: string
          submitted_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          description?: string | null
          draw_number: string
          id?: string
          project_id?: string | null
          requested_by?: string | null
          status?: string
          submitted_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          description?: string | null
          draw_number?: string
          id?: string
          project_id?: string | null
          requested_by?: string | null
          status?: string
          submitted_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          phase: string | null
          progress: number
          project_manager: string | null
          spent: number
          start_date: string | null
          status: string
          team_size: number
          updated_at: string
        }
        Insert: {
          budget?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          phase?: string | null
          progress?: number
          project_manager?: string | null
          spent?: number
          start_date?: string | null
          status?: string
          team_size?: number
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          phase?: string | null
          progress?: number
          project_manager?: string | null
          spent?: number
          start_date?: string | null
          status?: string
          team_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      rfis: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by_user: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          rfi_number: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by_user?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          rfi_number: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by_user?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          rfi_number?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string | null
          reviewer: string | null
          revision: number
          spec_section: string | null
          status: string
          submittal_number: string
          submitted_by: string | null
          submitted_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          reviewer?: string | null
          revision?: number
          spec_section?: string | null
          status?: string
          submittal_number: string
          submitted_by?: string | null
          submitted_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          reviewer?: string | null
          revision?: number
          spec_section?: string | null
          status?: string
          submittal_number?: string
          submitted_by?: string | null
          submitted_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lease_end: string | null
          lease_start: string | null
          monthly_rent: number
          notes: string | null
          property_name: string
          status: string
          tenant_name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number
          notes?: string | null
          property_name: string
          status?: string
          tenant_name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number
          notes?: string | null
          property_name?: string
          status?: string
          tenant_name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
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
      work_orders: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          property_name: string | null
          reported_by: string | null
          status: string
          title: string
          unit: string | null
          updated_at: string
          wo_number: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          property_name?: string | null
          reported_by?: string | null
          status?: string
          title: string
          unit?: string | null
          updated_at?: string
          wo_number: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          property_name?: string | null
          reported_by?: string | null
          status?: string
          title?: string
          unit?: string | null
          updated_at?: string
          wo_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "project_manager"
        | "superintendent"
        | "architect"
        | "engineer"
        | "owner"
        | "subcontractor"
        | "lender"
        | "field_staff"
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
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "project_manager",
        "superintendent",
        "architect",
        "engineer",
        "owner",
        "subcontractor",
        "lender",
        "field_staff",
      ],
    },
  },
} as const
