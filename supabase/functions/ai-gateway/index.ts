import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ========================
// Types
// ========================

interface AIRequest {
  action: string;
  instruction: string;
  documentContent?: string;
  selection?: string;
  styleInstructions?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  stream?: boolean;
  workspaceId?: string;
}

interface Credential {
  id: string;
  provider: string;
  name: string;
  api_key: string;
  base_url: string | null;
  default_model: string | null;
  is_enabled: boolean;
  owner_type: string;
  owner_id: string | null;
}

interface WorkspaceSettings {
  default_provider: string | null;
  default_model: string | null;
  fallback_provider: string | null;
  allow_byok: boolean;
}

interface AppSettings {
  default_provider: string | null;
  default_model: string | null;
  allow_byok: boolean;
  allow_custom_providers: boolean;
  maintenance_mode: boolean;
}

// ========================
// Provider configs
// ========================

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-flash-1.5"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  mistral: ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo"],
  custom: [],
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  google: "gemini-1.5-flash",
  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  custom: "gpt-4o-mini",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  write: "You are an expert writer. Create high-quality, well-structured content based on the user's description. Return only the content itself, no preamble.",
  continue: "You are an expert writer. Continue the provided text naturally, matching its style and voice. Return only the continuation.",
  rewrite: "You are an expert editor. Rewrite the provided content while preserving the core meaning. Improve clarity, flow, and engagement.",
  improve: "You are an expert editor. Improve the provided writing for clarity, engagement, and quality. Keep the core message intact.",
  expand: "You are an expert writer. Expand the provided content with more detail, examples, and depth.",
  shorten: "You are an expert editor. Make the provided content more concise while preserving all key information.",
  summarize: "You are an expert writer. Create a clear, accurate summary of the provided content.",
  translate: "You are a professional translator. Translate the content accurately while preserving tone and nuance.",
  change_tone: "You are an expert editor. Rewrite the content in the requested tone while keeping the core message.",
  brainstorm: "You are a creative writing consultant. Generate diverse, creative ideas related to the topic. Format as a clear list.",
  outline: "You are an expert writer. Create a detailed, logical outline for the requested content.",
  critique: "You are an expert writing coach. Provide specific, actionable feedback on the writing quality, structure, and effectiveness.",
};

// ========================
// Supabase client helper
// ========================

function getSupabaseClient(token: string) {
  // Use service role key for DB access within the function
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  
  // Simple fetch-based helpers — no SDK needed
  const headers: Record<string, string> = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  return {
    async select(table: string, params: Record<string, unknown>) {
      let query = `${url}/rest/v1/${table}?`;
      const filters: string[] = [];
      for (const [key, val] of Object.entries(params)) {
        if (val === null || val === undefined) continue;
        filters.push(`${key}=eq.${encodeURIComponent(String(val))}`);
      }
      query += filters.join("&");
      const res = await fetch(query, { headers: { ...headers, "Range": "0-99" } });
      if (!res.ok) throw new Error(`DB select failed: ${res.status}`);
      return res.json();
    },
    async selectSingle(table: string, params: Record<string, unknown>) {
      let query = `${url}/rest/v1/${table}?`;
      const filters: string[] = [];
      for (const [key, val] of Object.entries(params)) {
        if (val === null || val === undefined) continue;
        filters.push(`${key}=eq.${encodeURIComponent(String(val))}`);
      }
      query += filters.join("&") + "&limit=1";
      const res = await fetch(query, { headers });
      if (!res.ok) throw new Error(`DB select failed: ${res.status}`);
      const arr = await res.json();
      return arr[0] ?? null;
    },
    async rpc(fn: string, body: Record<string, unknown>) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`DB rpc failed: ${res.status}`);
      return res.json();
    },
    async insert(table: string, body: Record<string, unknown>) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`DB insert failed: ${res.status}`);
    },
    async updateUserMeta(userId: string, meta: Record<string, unknown>) {
      // Not used here but kept for reference
    },
  };
}

// ========================
// Credential resolution
// ========================

async function resolveCredentials(
  token: string,
  provider: string | undefined,
  model: string | undefined,
  workspaceId: string | undefined
): Promise<{ credential: Credential; model: string; provider: string }> {
  const db = getSupabaseClient(token);

  // 1. Get app settings
  const appSettings: AppSettings = await db.selectSingle("app_settings", { id: 1 }) ?? {
    default_provider: null, default_model: null, allow_byok: true, allow_custom_providers: true, maintenance_mode: false,
  };

  // 2. Get workspace settings if workspace provided
  let wsSettings: WorkspaceSettings | null = null;
  if (workspaceId) {
    wsSettings = await db.selectSingle("workspace_ai_settings", { workspace_id: workspaceId });
  }

  // 3. Determine target provider
  let targetProvider = provider ?? wsSettings?.default_provider ?? appSettings.default_provider;

  // If no provider configured at app/workspace level, try to auto-detect from user's credentials
  if (!targetProvider) {
    const userId = await getUserIdFromToken(token);
    if (userId && appSettings.allow_byok) {
      const userCreds: Credential[] = await db.select("ai_credentials", {
        owner_type: "user",
        owner_id: userId,
        is_enabled: true,
      });
      if (userCreds.length > 0) {
        targetProvider = userCreds[0].provider;
        // Use the user's preferred model if set
        if (!model && userCreds[0].default_model) {
          model = userCreds[0].default_model;
        }
      }
    }
  }

  // If still no provider, check system credentials
  if (!targetProvider) {
    const sysCreds: Credential[] = await db.select("ai_credentials", {
      owner_type: "system",
      is_enabled: true,
    });
    if (sysCreds.length > 0) {
      targetProvider = sysCreds[0].provider;
    }
  }

  if (!targetProvider) {
    throw new Error("No AI provider configured. Add an API key in Settings to start writing with AI.");
  }

  // 4. Determine target model
  const targetModel = model ?? wsSettings?.default_model ?? appSettings.default_model ?? DEFAULT_MODELS[targetProvider] ?? "gpt-4o-mini";

  // 5. Find credential — resolution hierarchy: workspace > user > system
  let credential: Credential | null = null;

  // Try workspace credential
  if (workspaceId) {
    const wsCreds: Credential[] = await db.select("ai_credentials", {
      owner_type: "workspace",
      owner_id: workspaceId,
      provider: targetProvider,
      is_enabled: true,
    });
    if (wsCreds.length > 0) credential = wsCreds[0];
  }

  // Try user BYOK credential
  if (!credential && appSettings.allow_byok) {
    // Get the user's ID from the JWT token
    const userId = await getUserIdFromToken(token);
    if (userId) {
      const userCreds: Credential[] = await db.select("ai_credentials", {
        owner_type: "user",
        owner_id: userId,
        provider: targetProvider,
        is_enabled: true,
      });
      if (userCreds.length > 0) credential = userCreds[0];
    }
  }

  // Try system credential
  if (!credential) {
    const sysCreds: Credential[] = await db.select("ai_credentials", {
      owner_type: "system",
      provider: targetProvider,
      is_enabled: true,
    });
    if (sysCreds.length > 0) credential = sysCreds[0];
  }

  // Fallback provider
  if (!credential) {
    const fallback = wsSettings?.fallback_provider;
    if (fallback && fallback !== targetProvider) {
      const allCreds: Credential[] = [];
      if (workspaceId) {
        const wsCreds: Credential[] = await db.select("ai_credentials", {
          owner_type: "workspace", owner_id: workspaceId, provider: fallback, is_enabled: true,
        });
        allCreds.push(...wsCreds);
      }
      if (allCreds.length === 0 && appSettings.allow_byok) {
        const userId = await getUserIdFromToken(token);
        if (userId) {
          const userCreds: Credential[] = await db.select("ai_credentials", {
            owner_type: "user", owner_id: userId, provider: fallback, is_enabled: true,
          });
          allCreds.push(...userCreds);
        }
      }
      if (allCreds.length === 0) {
        const sysCreds: Credential[] = await db.select("ai_credentials", {
          owner_type: "system", provider: fallback, is_enabled: true,
        });
        allCreds.push(...sysCreds);
      }
      if (allCreds.length > 0) {
        credential = allCreds[0];
        return {
          credential,
          model: model ?? DEFAULT_MODELS[fallback] ?? "gpt-4o-mini",
          provider: fallback,
        };
      }
    }

    // Last resort: check if there's a system env var for the provider
    const envKey = getEnvKeyForProvider(targetProvider);
    if (envKey) {
      const envVal = Deno.env.get(envKey);
      if (envVal) {
        credential = {
          id: "env",
          provider: targetProvider,
          name: "System (env)",
          api_key: envVal,
          base_url: null,
          default_model: null,
          is_enabled: true,
          owner_type: "system",
          owner_id: null,
        };
      }
    }

    if (!credential) {
      throw new Error(`No API key found for ${targetProvider}. Add your API key in Settings to start writing with AI.`);
    }
  }

  return { credential, model: targetModel, provider: targetProvider };
}

function getEnvKeyForProvider(provider: string): string | null {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[provider] ?? null;
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ========================
// Provider adapters
// ========================

interface ProviderResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

const PROVIDER_DEFAULT_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  custom: "https://api.openai.com/v1",
};

async function callOpenAI(cred: Credential, provider: string, model: string, systemPrompt: string, messages: { role: string; content: string }[], stream: boolean): Promise<Response> {
  const baseUrl = cred.base_url || PROVIDER_DEFAULT_URLS[provider] || "https://api.openai.com/v1";
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.7,
    max_tokens: 2048,
  };
  if (stream) body.stream = true;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cred.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function callAnthropic(cred: Credential, model: string, systemPrompt: string, messages: { role: string; content: string }[], stream: boolean): Promise<Response> {
  const baseUrl = cred.base_url || "https://api.anthropic.com/v1";
  const body: Record<string, unknown> = {
    model,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    max_tokens: 2048,
  };
  if (stream) body.stream = true;

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": cred.api_key,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function callGoogle(cred: Credential, model: string, systemPrompt: string, messages: { role: string; content: string }[], stream: boolean): Promise<Response> {
  const baseUrl = cred.base_url || `https://generativelanguage.googleapis.com/v1beta`;
  const action = stream ? "streamGenerateContent" : "generateContent";
  const url = `${baseUrl}/models/${model}:${action}?key=${cred.api_key}`;
  
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}

// ========================
// Response parsers
// ========================

function parseOpenAIResponse(data: Record<string, unknown>): ProviderResult {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const content = (choices?.[0]?.message as Record<string, unknown>)?.content as string ?? "";
  const usage = data.usage as Record<string, number> | undefined;
  return {
    content,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

function parseAnthropicResponse(data: Record<string, unknown>): ProviderResult {
  const contentBlocks = data.content as Array<Record<string, unknown>> | undefined;
  const content = contentBlocks?.map(b => b.text as string).join("") ?? "";
  const usage = data.usage as Record<string, number> | undefined;
  return {
    content,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

function parseGoogleResponse(data: Record<string, unknown>): ProviderResult {
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
  const contentParts = (candidates?.[0]?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
  const content = contentParts?.map(p => p.text as string).join("") ?? "";
  const usageMeta = data.usageMetadata as Record<string, number> | undefined;
  return {
    content,
    inputTokens: usageMeta?.promptTokenCount ?? 0,
    outputTokens: usageMeta?.candidatesTokenCount ?? 0,
  };
}

// ========================
// Stream helpers
// ========================

function createStreamTransformer(provider: string): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        let data = trimmed;
        if (data.startsWith("data: ")) data = data.slice(6);
        if (data === "[DONE]") {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          let text = "";

          if (provider === "openai" || provider === "openrouter" || provider === "custom" || provider === "deepseek" || provider === "groq" || provider === "mistral") {
            const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
            const delta = (choices?.[0]?.delta as Record<string, unknown>)?.content as string | undefined;
            text = delta ?? "";
          } else if (provider === "anthropic") {
            if (parsed.type === "content_block_delta") {
              const delta = parsed.delta as Record<string, unknown>;
              text = (delta?.text as string) ?? "";
            }
          } else if (provider === "google") {
            const candidates = parsed.candidates as Array<Record<string, unknown>> | undefined;
            const parts = (candidates?.[0]?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
            text = parts?.map(p => p.text as string).join("") ?? "";
          }

          if (text) {
            const sseData = JSON.stringify({ content: text });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    },
  });
}

// ========================
// Usage logging
// ========================

async function logUsage(
  token: string,
  params: {
    userId: string | null;
    workspaceId: string | null;
    provider: string;
    model: string;
    action: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    status: "success" | "error";
    errorMessage?: string;
  }
) {
  try {
    const db = getSupabaseClient(token);
    const cost = (params.inputTokens * 0.00000015) + (params.outputTokens * 0.0000006);
    await db.insert("ai_usage_logs", {
      user_id: params.userId,
      workspace_id: params.workspaceId,
      provider: params.provider,
      model: params.model,
      action: params.action,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      latency_ms: params.latencyMs,
      estimated_cost_usd: cost,
      status: params.status,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // Silent fail — don't block AI response for logging errors
  }
}

// ========================
// Main handler
// ========================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check maintenance mode
    const db = getSupabaseClient(token);
    const appSettings: AppSettings | null = await db.selectSingle("app_settings", { id: 1 });
    if (appSettings?.maintenance_mode) {
      return new Response(
        JSON.stringify({ error: "Writelab is currently under maintenance. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AIRequest = await req.json();
    if (!body.action || !body.instruction) {
      return new Response(
        JSON.stringify({ error: "Action and instruction are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve credentials
    let credResult: { credential: Credential; model: string; provider: string };
    try {
      credResult = await resolveCredentials(token, undefined, undefined, body.workspaceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider resolution failed";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { credential, model, provider } = credResult;
    const systemPrompt = (SYSTEM_PROMPTS[body.action] ?? SYSTEM_PROMPTS.write) +
      (body.styleInstructions ? `\n\nStyle guidelines: ${body.styleInstructions}` : "");

    // Build user message
    const parts: string[] = [];
    if (body.selection?.trim()) {
      parts.push(`Selected text:\n"""\n${body.selection.trim()}\n"""`);
    } else if (body.documentContent?.trim()) {
      parts.push(`Current document:\n"""\n${body.documentContent.trim().slice(0, 6000)}\n"""`);
    }
    parts.push(body.instruction);
    const userMessage = parts.join("\n\n");

    const messages: { role: string; content: string }[] = [];
    if (body.conversationHistory?.length) {
      for (const msg of body.conversationHistory.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: userMessage });

    const startTime = Date.now();
    const userId = await getUserIdFromToken(token);

    // Route to provider
    let providerRes: Response;
    if (provider === "anthropic") {
      providerRes = await callAnthropic(credential, model, systemPrompt, messages, body.stream ?? false);
    } else if (provider === "google") {
      providerRes = await callGoogle(credential, model, systemPrompt, messages, body.stream ?? false);
    } else {
      // openai, openrouter, deepseek, groq, mistral, custom all use OpenAI-compatible API
      providerRes = await callOpenAI(credential, provider, model, systemPrompt, messages, body.stream ?? false);
    }

    if (!providerRes.ok) {
      const errBody = await providerRes.json().catch(() => ({ error: { message: "Unknown provider error" } }));
      const rawMsg = errBody?.error?.message ?? `Provider error ${providerRes.status}`;
      const friendlyMsg = providerRes.status === 401
        ? "We couldn't connect to your AI provider. Check your API key in Settings and try again."
        : providerRes.status === 429
        ? "This AI provider has reached its usage limit. Try another provider or update your API settings."
        : rawMsg;

      const latencyMs = Date.now() - startTime;
      await logUsage(token, {
        userId, workspaceId: body.workspaceId ?? null,
        provider, model, action: body.action,
        inputTokens: 0, outputTokens: 0, latencyMs,
        status: "error", errorMessage: friendlyMsg,
      });

      return new Response(
        JSON.stringify({ error: friendlyMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Streaming response
    if (body.stream) {
      const stream = providerRes.body!.pipeThrough(createStreamTransformer(provider));
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response
    const data = await providerRes.json();
    let result: ProviderResult;
    if (provider === "anthropic") {
      result = parseAnthropicResponse(data);
    } else if (provider === "google") {
      result = parseGoogleResponse(data);
    } else {
      result = parseOpenAIResponse(data);
    }

    const latencyMs = Date.now() - startTime;
    await logUsage(token, {
      userId, workspaceId: body.workspaceId ?? null,
      provider, model, action: body.action,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens, latencyMs,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs,
        model,
        provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
