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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          label: string | null
          max_uses: number | null
          source: string | null
          updated_at: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          label?: string | null
          max_uses?: number | null
          source?: string | null
          updated_at?: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          label?: string | null
          max_uses?: number | null
          source?: string | null
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      deals: {
        Row: {
          created_at: string
          deal_price: number | null
          id: string
          ingredient_key: string | null
          package_quantity: number | null
          product_name: string | null
          regular_price: number | null
          store: string | null
          unit: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          deal_price?: number | null
          id?: string
          ingredient_key?: string | null
          package_quantity?: number | null
          product_name?: string | null
          regular_price?: number | null
          store?: string | null
          unit?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          deal_price?: number | null
          id?: string
          ingredient_key?: string | null
          package_quantity?: number | null
          product_name?: string | null
          regular_price?: number | null
          store?: string | null
          unit?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      deck_items: {
        Row: {
          created_at: string
          deal_count: number | null
          est_cost_per_portion: number | null
          household_id: string
          id: string
          position: number | null
          recipe_id: string
          source: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          deal_count?: number | null
          est_cost_per_portion?: number | null
          household_id: string
          id?: string
          position?: number | null
          recipe_id: string
          source?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          deal_count?: number | null
          est_cost_per_portion?: number | null
          household_id?: string
          id?: string
          position?: number | null
          recipe_id?: string
          source?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          household_id: string | null
          id: number
          name: string | null
          props: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: never
          name?: string | null
          props?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: never
          name?: string | null
          props?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          answer: string | null
          created_at: string
          household_id: string | null
          id: string
          kind: string | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          kind?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          kind?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          allergies: string[]
          created_at: string
          diet: string
          dislikes: string[]
          display_name: string | null
          household_id: string
          id: string
          is_kid: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allergies?: string[]
          created_at?: string
          diet?: string
          dislikes?: string[]
          display_name?: string | null
          household_id: string
          id?: string
          is_kid?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allergies?: string[]
          created_at?: string
          diet?: string
          dislikes?: string[]
          display_name?: string | null
          household_id?: string
          id?: string
          is_kid?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          deck_adjusted_at: string | null
          dinners_per_week: number
          id: string
          invite_code: string
          max_cook_minutes: number
          name: string | null
          stores: string[]
          updated_at: string
          weekly_budget: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deck_adjusted_at?: string | null
          dinners_per_week?: number
          id?: string
          invite_code?: string
          max_cook_minutes?: number
          name?: string | null
          stores?: string[]
          updated_at?: string
          weekly_budget?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deck_adjusted_at?: string | null
          dinners_per_week?: number
          id?: string
          invite_code?: string
          max_cook_minutes?: number
          name?: string | null
          stores?: string[]
          updated_at?: string
          weekly_budget?: number | null
        }
        Relationships: []
      }
      ingredient_prices: {
        Row: {
          created_at: string
          ingredient_key: string
          per_quantity: number | null
          price: number | null
          store: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ingredient_key: string
          per_quantity?: number | null
          price?: number | null
          store: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ingredient_key?: string
          per_quantity?: number | null
          price?: number | null
          store?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ingredient_translations: {
        Row: {
          created_at: string
          display_name: string | null
          ingredient_key: string
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          ingredient_key: string
          locale: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          ingredient_key?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_plan_entries: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_leftover_day: boolean
          plan_date: string | null
          recipe_id: string | null
          servings: number | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_leftover_day?: boolean
          plan_date?: string | null
          recipe_id?: string | null
          servings?: number | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_leftover_day?: boolean
          plan_date?: string | null
          recipe_id?: string | null
          servings?: number | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          beta_code: string | null
          created_at: string
          display_name: string | null
          id: string
          is_early_member: boolean
          locale: string
          signup_source: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          beta_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_early_member?: boolean
          locale?: string
          signup_source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          beta_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_early_member?: boolean
          locale?: string
          signup_source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          aisle: string | null
          created_at: string
          display_name: string | null
          id: string
          ingredient_key: string
          is_pantry: boolean
          quantity: number | null
          recipe_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          aisle?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          ingredient_key: string
          is_pantry?: boolean
          quantity?: number | null
          recipe_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          aisle?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          ingredient_key?: string
          is_pantry?: boolean
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: string
          recipe_id: string
          steps: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: string
          recipe_id: string
          steps?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: string
          recipe_id?: string
          steps?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_translations_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          active: boolean
          allergens: string[]
          base_servings: number
          created_at: string
          description: string | null
          diet_tags: string[]
          id: string
          image_url: string | null
          main_ingredient: string | null
          prep_minutes: number | null
          steps: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allergens?: string[]
          base_servings?: number
          created_at?: string
          description?: string | null
          diet_tags?: string[]
          id?: string
          image_url?: string | null
          main_ingredient?: string | null
          prep_minutes?: number | null
          steps?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allergens?: string[]
          base_servings?: number
          created_at?: string
          description?: string | null
          diet_tags?: string[]
          id?: string
          image_url?: string | null
          main_ingredient?: string | null
          prep_minutes?: number | null
          steps?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          email: string | null
          household_id: string
          id: string
          status: string
          stripe_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          household_id: string
          id?: string
          status?: string
          stripe_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          household_id?: string
          id?: string
          status?: string
          stripe_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          aisle: string | null
          checked: boolean
          checked_by: string | null
          created_at: string
          deal_price: number | null
          display_name: string | null
          est_price: number | null
          household_id: string
          id: string
          ingredient_key: string | null
          is_custom: boolean
          is_deal: boolean
          quantity_text: string | null
          store: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          aisle?: string | null
          checked?: boolean
          checked_by?: string | null
          created_at?: string
          deal_price?: number | null
          display_name?: string | null
          est_price?: number | null
          household_id: string
          id?: string
          ingredient_key?: string | null
          is_custom?: boolean
          is_deal?: boolean
          quantity_text?: string | null
          store?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          aisle?: string | null
          checked?: boolean
          checked_by?: string | null
          created_at?: string
          deal_price?: number | null
          display_name?: string | null
          est_price?: number | null
          household_id?: string
          id?: string
          ingredient_key?: string | null
          is_custom?: boolean
          is_deal?: boolean
          quantity_text?: string | null
          store?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string
          household_id: string
          id: string
          member_id: string
          recipe_id: string
          updated_at: string
          vote: string
          week_start: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          member_id: string
          recipe_id: string
          updated_at?: string
          vote: string
          week_start: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          member_id?: string
          recipe_id?: string
          updated_at?: string
          vote?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_household_id_member_id_fkey"
            columns: ["household_id", "member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "swipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: {
        Args: {
          p_beta_code: string
          p_dinners_per_week: number
          p_max_cook_minutes: number
          p_name: string
          p_stores: string[]
          p_weekly_budget: number
        }
        Returns: string
      }
      current_week_start: { Args: never; Returns: string }
      generate_deck: {
        Args: { p_household_id: string; p_week_start: string }
        Returns: {
          allergens: string[]
          base_servings: number
          deal_count: number
          description: string
          diet_tags: string[]
          est_cost_per_portion: number
          id: string
          image_url: string
          position: number
          prep_minutes: number
          recipe_id: string
          source: string
          title: string
        }[]
      }
      import_recipe: { Args: { p_recipe: Json }; Returns: string }
      invite_household_name: {
        Args: { p_invite_code: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: { hh: string }; Returns: boolean }
      join_household: { Args: { p_invite_code: string }; Returns: string }
      refresh_deck: { Args: { p_household_id: string }; Returns: undefined }
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
    Enums: {},
  },
} as const
