export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          user_id?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          content: Record<string, unknown>;
          plain_text: string | null;
          status: 'draft' | 'published' | 'archived';
          word_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title?: string;
          content?: Record<string, unknown>;
          plain_text?: string | null;
          status?: 'draft' | 'published' | 'archived';
          word_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          plain_text?: string | null;
          status?: 'draft' | 'published' | 'archived';
          word_count?: number;
          updated_at?: string;
        };
      };
      writing_styles: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          tone: string | null;
          audience: string | null;
          instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          tone?: string | null;
          audience?: string | null;
          instructions?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          tone?: string | null;
          audience?: string | null;
          instructions?: string | null;
        };
      };
      ai_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string | null;
          document_id: string | null;
          provider: string;
          model: string;
          action: string;
          input_tokens: number;
          output_tokens: number;
          latency_ms: number;
          estimated_cost_usd: number;
          status: 'success' | 'error';
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          workspace_id?: string | null;
          document_id?: string | null;
          provider?: string;
          model?: string;
          action: string;
          input_tokens?: number;
          output_tokens?: number;
          latency_ms?: number;
          estimated_cost_usd?: number;
          status?: 'success' | 'error';
          error_message?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          is_admin: boolean;
          is_disabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          display_name?: string;
          is_admin?: boolean;
          is_disabled?: boolean;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          is_admin?: boolean;
          is_disabled?: boolean;
        };
      };
      ai_credentials: {
        Row: {
          id: string;
          owner_type: 'system' | 'workspace' | 'user';
          owner_id: string | null;
          provider: string;
          name: string;
          api_key: string;
          base_url: string | null;
          default_model: string | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_type?: 'system' | 'workspace' | 'user';
          owner_id?: string | null;
          provider: string;
          name?: string;
          api_key: string;
          base_url?: string | null;
          default_model?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          api_key?: string;
          base_url?: string | null;
          default_model?: string | null;
          is_enabled?: boolean;
        };
      };
      workspace_ai_settings: {
        Row: {
          id: string;
          workspace_id: string;
          default_provider: string | null;
          default_model: string | null;
          fallback_provider: string | null;
          allow_byok: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          default_provider?: string | null;
          default_model?: string | null;
          fallback_provider?: string | null;
          allow_byok?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          default_provider?: string | null;
          default_model?: string | null;
          fallback_provider?: string | null;
          allow_byok?: boolean;
        };
      };
      app_settings: {
        Row: {
          id: number;
          default_provider: string | null;
          default_model: string | null;
          allow_byok: boolean;
          allow_custom_providers: boolean;
          maintenance_mode: boolean;
          updated_at: string;
        };
        Insert: {
          id?: number;
          default_provider?: string | null;
          default_model?: string | null;
          allow_byok?: boolean;
          allow_custom_providers?: boolean;
          maintenance_mode?: boolean;
          updated_at?: string;
        };
        Update: {
          default_provider?: string | null;
          default_model?: string | null;
          allow_byok?: boolean;
          allow_custom_providers?: boolean;
          maintenance_mode?: boolean;
        };
      };
      site_plans: {
        Row: {
          id: string;
          name: string;
          tagline: string;
          price: string;
          period: string;
          features: string[];
          highlighted: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tagline?: string;
          price?: string;
          period?: string;
          features?: string[];
          highlighted?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          tagline?: string;
          price?: string;
          period?: string;
          features?: string[];
          highlighted?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      site_faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          question?: string;
          answer?: string;
          sort_order?: number;
          updated_at?: string;
        };
      };
      extensions: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          version: string;
          status: string;
          is_premium: boolean;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          description?: string | null;
          version?: string;
          status?: string;
          is_premium?: boolean;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          version?: string;
          status?: string;
          is_premium?: boolean;
          enabled?: boolean;
        };
      };
      extension_actions: {
        Row: {
          id: number;
          extension_id: string;
          slug: string;
          name: string;
          description: string | null;
          credit_cost: number;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          extension_id: string;
          slug: string;
          name: string;
          description?: string | null;
          credit_cost?: number;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          credit_cost?: number;
          enabled?: boolean;
        };
      };
      entitlements: {
        Row: {
          id: number;
          user_id: string;
          workspace_id: string;
          extension_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          workspace_id: string;
          extension_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
        };
      };
      subscriptions: {
        Row: {
          id: number;
          user_id: string;
          workspace_id: string;
          provider: string;
          external_subscription_id: string;
          plan: string;
          status: string;
          started_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          workspace_id: string;
          provider: string;
          external_subscription_id: string;
          plan: string;
          status?: string;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          expires_at?: string | null;
        };
      };
      payments: {
        Row: {
          id: number;
          user_id: string;
          workspace_id: string;
          provider: string;
          external_id: string | null;
          type: string;
          amount: number;
          currency: string;
          status: string;
          reference: string | null;
          metadata: Record<string, unknown> | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          workspace_id: string;
          provider: string;
          external_id?: string | null;
          type?: string;
          amount: number;
          currency?: string;
          status?: string;
          reference?: string | null;
          metadata?: Record<string, unknown> | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
      };
      credit_balances: {
        Row: {
          id: number;
          user_id: string;
          workspace_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          workspace_id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
        };
      };
      credit_transactions: {
        Row: {
          id: number;
          user_id: string;
          workspace_id: string;
          type: string;
          amount: number;
          balance_after: number;
          reference_type: string | null;
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          workspace_id: string;
          type: string;
          amount: number;
          balance_after: number;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
