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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_generated_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          language: string
          listing_id: string
          model: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          kind: string
          language?: string
          listing_id: string
          model?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          language?: string
          listing_id?: string
          model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          reason?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          owner_id: string
          owner_last_read_at: string | null
          prequalification_note: string | null
          prequalified: boolean
          seeker_id: string
          seeker_last_read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          owner_id: string
          owner_last_read_at?: string | null
          prequalification_note?: string | null
          prequalified?: boolean
          seeker_id: string
          seeker_last_read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          owner_id?: string
          owner_last_read_at?: string | null
          prequalification_note?: string | null
          prequalified?: boolean
          seeker_id?: string
          seeker_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_features: {
        Row: {
          id: string
          label: string
          listing_id: string
        }
        Insert: {
          id?: string
          label: string
          listing_id: string
        }
        Update: {
          id?: string
          label?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_features_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_area: string
          available_from: string | null
          bathrooms: number
          bedrooms: number
          city: string
          country: string
          created_at: string
          deposit: number | null
          description: string
          direct_owner: boolean
          faq: Json
          floor: number | null
          furnished: boolean
          garage: boolean
          id: string
          intent: string
          last_verified_at: string | null
          latitude: number | null
          location_approximate: boolean
          longitude: number | null
          maximum_stay: string | null
          minimum_stay: string | null
          mode: string
          new_build: boolean
          owner_id: string
          owner_name: string
          owner_rules: string | null
          pets_allowed: boolean
          pool: boolean
          price_monthly: number | null
          price_sale: number | null
          property_type: string
          rating: number | null
          review_count: number
          sea_view: boolean
          size_m2: number
          slug: string | null
          status: string
          summary: string
          term: string | null
          title: string
          total_move_in_cost: number | null
          updated_at: string
          utilities_monthly: number | null
          verified_owner: boolean
          verified_property: boolean
        }
        Insert: {
          address_area?: string
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          city: string
          country?: string
          created_at?: string
          deposit?: number | null
          description?: string
          direct_owner?: boolean
          faq?: Json
          floor?: number | null
          furnished?: boolean
          garage?: boolean
          id?: string
          intent: string
          last_verified_at?: string | null
          latitude?: number | null
          location_approximate?: boolean
          longitude?: number | null
          maximum_stay?: string | null
          minimum_stay?: string | null
          mode: string
          new_build?: boolean
          owner_id: string
          owner_name?: string
          owner_rules?: string | null
          pets_allowed?: boolean
          pool?: boolean
          price_monthly?: number | null
          price_sale?: number | null
          property_type: string
          rating?: number | null
          review_count?: number
          sea_view?: boolean
          size_m2?: number
          slug?: string | null
          status?: string
          summary?: string
          term?: string | null
          title: string
          total_move_in_cost?: number | null
          updated_at?: string
          utilities_monthly?: number | null
          verified_owner?: boolean
          verified_property?: boolean
        }
        Update: {
          address_area?: string
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          country?: string
          created_at?: string
          deposit?: number | null
          description?: string
          direct_owner?: boolean
          faq?: Json
          floor?: number | null
          furnished?: boolean
          garage?: boolean
          id?: string
          intent?: string
          last_verified_at?: string | null
          latitude?: number | null
          location_approximate?: boolean
          longitude?: number | null
          maximum_stay?: string | null
          minimum_stay?: string | null
          mode?: string
          new_build?: boolean
          owner_id?: string
          owner_name?: string
          owner_rules?: string | null
          pets_allowed?: boolean
          pool?: boolean
          price_monthly?: number | null
          price_sale?: number | null
          property_type?: string
          rating?: number | null
          review_count?: number
          sea_view?: boolean
          size_m2?: number
          slug?: string | null
          status?: string
          summary?: string
          term?: string | null
          title?: string
          total_move_in_cost?: number | null
          updated_at?: string
          utilities_monthly?: number | null
          verified_owner?: boolean
          verified_property?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_kind: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_kind?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: string
          terms_accepted_at: string | null
          terms_version: string | null
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          role?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          author_name: string
          comment: string
          created_at: string
          id: string
          listing_id: string
          rating: number
        }
        Insert: {
          author_id: string
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          listing_id: string
          rating: number
        }
        Update: {
          author_id?: string
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_records: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          listing_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_requests: {
        Row: {
          created_at: string
          end_date: string | null
          guests: number | null
          id: string
          kind: string
          listing_id: string
          note: string | null
          preferred_date: string
          requester_id: string
          requester_name: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          guests?: number | null
          id?: string
          kind?: string
          listing_id: string
          note?: string | null
          preferred_date: string
          requester_id: string
          requester_name?: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          guests?: number | null
          id?: string
          kind?: string
          listing_id?: string
          note?: string | null
          preferred_date?: string
          requester_id?: string
          requester_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          interest: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interest?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interest?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      listing_busy_ranges: {
        Args: { p_listing_id: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      mark_conversation_read: {
        Args: { conversation_id: string }
        Returns: undefined
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
