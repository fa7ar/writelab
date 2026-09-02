import type { Database } from './database.types';

export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type WritingStyle = Database['public']['Tables']['writing_styles']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AICredential = Database['public']['Tables']['ai_credentials']['Row'];
export type WorkspaceAISettings = Database['public']['Tables']['workspace_ai_settings']['Row'];
export type AppSettings = Database['public']['Tables']['app_settings']['Row'];
export type SitePlan = Database['public']['Tables']['site_plans']['Row'];
export type SiteFaq = Database['public']['Tables']['site_faqs']['Row'];
export type AIUsageLog = Database['public']['Tables']['ai_usage_logs']['Row'];

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'deepseek' | 'groq' | 'mistral' | 'custom';

export type AIAction =
  | 'write'
  | 'continue'
  | 'rewrite'
  | 'improve'
  | 'expand'
  | 'shorten'
  | 'summarize'
  | 'translate'
  | 'change_tone'
  | 'brainstorm'
  | 'outline'
  | 'critique';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: AIAction;
  timestamp: Date;
}

export interface AIRequest {
  action: AIAction;
  instruction: string;
  documentContent?: string;
  selection?: string;
  styleInstructions?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  stream?: boolean;
  workspaceId?: string;
}

export interface AIResponse {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  model?: string;
  provider?: string;
}

export interface CredentialInfo {
  id: string;
  provider: AIProvider;
  name: string;
  base_url: string | null;
  default_model: string | null;
  is_enabled: boolean;
  owner_type: string;
  created_at: string;
}

export type View = 'loading' | 'auth' | 'public' | 'home' | 'workspace' | 'settings' | 'admin' | 'extensions';

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  mistral: 'Mistral',
  custom: 'Custom (OpenAI-compatible)',
};

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
  custom: [],
};

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 3) + '••••••••' + key.slice(-4);
}
