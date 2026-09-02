import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ========================
// Copywriting framework prompts
// ========================

const COPYWRITING_PROMPTS: Record<string, { system: string; userTemplate: string }> = {
  aida: {
    system: "You are an expert direct-response copywriter. Write compelling copy using the AIDA framework (Attention, Interest, Desire, Action). Return only the copy, formatted with clear section headers.",
    userTemplate: "Write AIDA-framework copy for the following context.\n\nContext:\n{context}\n\nWrite the full copy with these four sections:\n1. Attention — a bold headline that grabs the reader\n2. Interest — build interest with relevant facts or pain points\n3. Desire — amplify desire with benefits and social proof\n4. Action — a clear, urgent call to action",
  },
  pas: {
    system: "You are an expert copywriter specializing in pain-point marketing. Write compelling copy using the PAS framework (Problem, Agitate, Solution). Return only the copy, formatted with clear section headers.",
    userTemplate: "Write PAS-framework copy for the following context.\n\nContext:\n{context}\n\nWrite the full copy with these three sections:\n1. Problem — name the reader's problem clearly\n2. Agitate — amplify the pain, consequences, frustration\n3. Solution — present the solution as the answer to the pain",
  },
  bab: {
    system: "You are an expert copywriter. Write compelling copy using the BAB framework (Before, After, Bridge). Return only the copy, formatted with clear section headers.",
    userTemplate: "Write BAB-framework copy for the following context.\n\nContext:\n{context}\n\nWrite the full copy with these three sections:\n1. Before — paint the current reality (the before state)\n2. After — paint the desired future (the after state)\n3. Bridge — show how to get from before to after using the product or idea",
  },
  fab: {
    system: "You are an expert product copywriter. Write compelling copy using the FAB framework (Features, Advantages, Benefits). Return only the copy, formatted with clear section headers.",
    userTemplate: "Write FAB-framework copy for the following context.\n\nContext:\n{context}\n\nWrite the full copy with these three sections:\n1. Features — list the key features of the product or service\n2. Advantages — explain what each feature does better than alternatives\n3. Benefits — translate into tangible, emotional benefits for the customer",
  },
  "4p": {
    system: "You are an expert offer copywriter. Write compelling copy using the 4P framework (Promise, Picture, Proof, Push). Return only the copy, formatted with clear section headers.",
    userTemplate: "Write 4P-framework copy for the following context.\n\nContext:\n{context}\n\nWrite the full copy with these four sections:\n1. Promise — make a bold, specific promise to the reader\n2. Picture — paint a vivid picture of enjoying the promise\n3. Proof — back it up with evidence, testimonials, or data\n4. Push — drive the reader to take action now",
  },
};

// ========================
// Types
// ========================

interface ExtensionActionRequest {
  workspaceId: string;
  extensionId: string;
  actionSlug: string;
  documentContent?: string;
  selection?: string;
}

interface Credential {
  id: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  default_model: string | null;
  owner_type: string;
  owner_id: string | null;
}

interface AppSettings {
  default_provider: string | null;
  default_model: string | null;
  allow_byok: boolean;
  maintenance_mode: boolean;
}

// ========================
// DB helper
// ========================

function getDb() {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  return {
    async selectSingle(table: string, params: Record<string, unknown>) {
      const filters = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
        .join("&");
      const res = await fetch(`${url}/rest/v1/${table}?${filters}&limit=1`, { headers });
      if (!res.ok) return null;
      const arr = await res.json();
      return arr[0] ?? null;
    },
    async selectAll(table: string, params: Record<string, unknown>) {
      const filters = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
        .join("&");
      const res = await fetch(`${url}/rest/v1/${table}?${filters}`, { headers });
      if (!res.ok) return [];
      return res.json();
    },
    async rpc(fn: string, body: Record<string, unknown>) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`RPC ${fn} failed: ${res.status} ${errText}`);
      }
      return res.json();
    },
    async insert(table: string, body: Record<string, unknown>) {
      await fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(body),
      });
    },
  };
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
// Credential resolution (reuses ai-gateway pattern)
// ========================

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

const PROVIDER_DEFAULT_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  custom: "https://api.openai.com/v1",
};

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

async function resolveCredentials(
  token: string,
  workspaceId: string
): Promise<{ credential: Credential; model: string; provider: string }> {
  const db = getDb();
  const userId = await getUserIdFromToken(token);

  const appSettings = (await db.selectSingle("app_settings", { id: "1" })) as AppSettings | null;
  let wsSettings: { default_provider: string | null; default_model: string | null; fallback_provider: string | null } | null = null;
  if (workspaceId) {
    wsSettings = await db.selectSingle("workspace_ai_settings", { workspace_id: workspaceId });
  }

  const targetProvider = wsSettings?.default_provider ?? appSettings?.default_provider;
  if (!targetProvider) {
    throw new Error("No AI provider configured. Ask your admin to add an API key in Settings.");
  }
  const targetModel = wsSettings?.default_model ?? appSettings?.default_model ?? DEFAULT_MODELS[targetProvider] ?? "gpt-4o-mini";

  let credential: Credential | null = null;

  // Workspace credential
  if (workspaceId) {
    const wsCreds = await db.selectAll("ai_credentials", {
      owner_type: "workspace", owner_id: workspaceId, provider: targetProvider, is_enabled: true,
    });
    if (wsCreds.length > 0) credential = wsCreds[0];
  }

  // User BYOK
  if (!credential && appSettings?.allow_byok && userId) {
    const userCreds = await db.selectAll("ai_credentials", {
      owner_type: "user", owner_id: userId, provider: targetProvider, is_enabled: true,
    });
    if (userCreds.length > 0) credential = userCreds[0];
  }

  // System credential
  if (!credential) {
    const sysCreds = await db.selectAll("ai_credentials", {
      owner_type: "system", provider: targetProvider, is_enabled: true,
    });
    if (sysCreds.length > 0) credential = sysCreds[0];
  }

  // Fallback provider
  if (!credential) {
    const fallback = wsSettings?.fallback_provider;
    if (fallback && fallback !== targetProvider) {
      const allCreds: Credential[] = [];
      if (workspaceId) {
        const wsCreds = await db.selectAll("ai_credentials", {
          owner_type: "workspace", owner_id: workspaceId, provider: fallback, is_enabled: true,
        });
        allCreds.push(...wsCreds);
      }
      if (allCreds.length === 0 && appSettings?.allow_byok && userId) {
        const userCreds = await db.selectAll("ai_credentials", {
          owner_type: "user", owner_id: userId, provider: fallback, is_enabled: true,
        });
        allCreds.push(...userCreds);
      }
      if (allCreds.length === 0) {
        const sysCreds = await db.selectAll("ai_credentials", {
          owner_type: "system", provider: fallback, is_enabled: true,
        });
        allCreds.push(...sysCreds);
      }
      if (allCreds.length > 0) {
        return { credential: allCreds[0], model: DEFAULT_MODELS[fallback] ?? "gpt-4o-mini", provider: fallback };
      }
    }

    // Env var fallback
    const envKey = getEnvKeyForProvider(targetProvider);
    if (envKey) {
      const envVal = Deno.env.get(envKey);
      if (envVal) {
        credential = {
          id: "env", provider: targetProvider, api_key: envVal, base_url: null,
          default_model: null, owner_type: "system", owner_id: null,
        };
      }
    }

    if (!credential) {
      throw new Error(`No API key found for ${targetProvider}. Ask your admin to configure AI in Settings.`);
    }
  }

  return { credential, model: targetModel, provider: targetProvider };
}

// ========================
// Provider call (non-streaming)
// ========================

async function callProvider(
  cred: Credential, provider: string, model: string, systemPrompt: string, userMessage: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  if (provider === "anthropic") {
    const baseUrl = cred.base_url || "https://api.anthropic.com/v1";
    const res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": cred.api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 2048,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    const data = await res.json();
    const content = (data.content as Array<Record<string, unknown>>)?.map((b) => b.text as string).join("") ?? "";
    return { content, inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 };
  }

  if (provider === "google") {
    const baseUrl = cred.base_url || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${baseUrl}/models/${model}:generateContent?key=${cred.api_key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) throw new Error(`Google error: ${res.status}`);
    const data = await res.json();
    const parts = (data.candidates?.[0]?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>>;
    const content = parts?.map((p) => p.text as string).join("") ?? "";
    return { content, inputTokens: data.usageMetadata?.promptTokenCount ?? 0, outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0 };
  }

  // OpenAI-compatible (openai, openrouter, deepseek, groq, mistral, custom)
  const baseUrl = cred.base_url || PROVIDER_DEFAULT_URLS[provider] || "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cred.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Provider error: ${res.status}`);
  const data = await res.json();
  const content = (data.choices?.[0]?.message as Record<string, unknown>)?.content as string ?? "";
  return { content, inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 };
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
      return json({ error: "Authentication required." }, 401);
    }

    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return json({ error: "Invalid authentication token." }, 401);
    }

    const body: ExtensionActionRequest = await req.json();
    const { workspaceId, extensionId, actionSlug } = body;

    if (!workspaceId || !extensionId || !actionSlug) {
      return json({ error: "workspaceId, extensionId, and actionSlug are required." }, 400);
    }

    const db = getDb();

    // 1. Verify extension exists and is enabled
    const extension = await db.selectSingle("extensions", { id: extensionId, enabled: true, status: "active" });
    if (!extension) {
      return json({ error: "Extension not found or inactive." }, 404);
    }

    // 2. Verify action exists and get credit cost
    const action = await db.selectSingle("extension_actions", {
      extension_id: extensionId, slug: actionSlug, enabled: true,
    });
    if (!action) {
      return json({ error: "Action not found or disabled." }, 404);
    }
    const creditCost = action.credit_cost as number;

    // 3. Check entitlement (if premium extension)
    if (extension.is_premium) {
      const entitled = await db.rpc("check_entitlement", {
        p_workspace_id: workspaceId,
        p_extension_id: extensionId,
      });
      if (!entitled) {
        return json({ error: "EXTENSION_LOCKED", extensionId }, 403);
      }
    }

    // 4. Consume credits atomically (throws on insufficient balance)
    let newBalance: number;
    try {
      newBalance = await db.rpc("consume_credits", {
        p_workspace_id: workspaceId,
        p_amount: creditCost,
        p_reference_type: "extension_action",
        p_reference_id: `${extensionId}:${actionSlug}`,
        p_description: `${extension.name} — ${action.name}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Credit deduction failed";
      if (msg.includes("INSUFFICIENT_CREDITS")) {
        return json({ error: "INSUFFICIENT_CREDITS", required: creditCost }, 402);
      }
      return json({ error: "Failed to deduct credits. Please try again." }, 500);
    }

    // 5. Build prompt
    const framework = COPYWRITING_PROMPTS[actionSlug];
    if (!framework) {
      return json({ error: "Unknown copywriting framework." }, 400);
    }

    const context = body.selection?.trim() || body.documentContent?.trim()?.slice(0, 6000) || "";
    const userMessage = framework.userTemplate.replace("{context}", context || "(no specific context provided — generate general copy)");

    // 6. Call AI provider
    let aiResult: { content: string; inputTokens: number; outputTokens: number };
    try {
      const { credential, model, provider } = await resolveCredentials(token, workspaceId);
      aiResult = await callProvider(credential, provider, model, framework.system, userMessage);
    } catch (err) {
      // Refund credits on AI failure
      await db.rpc("refund_credits", {
        p_workspace_id: workspaceId,
        p_amount: creditCost,
        p_reference_type: "extension_action",
        p_reference_id: `${extensionId}:${actionSlug}`,
        p_description: `Refund: AI error for ${action.name}`,
      });

      const msg = err instanceof Error ? err.message : "AI request failed";
      return json({ error: msg, refunded: true }, 502);
    }

    // 7. Log usage
    try {
      await db.insert("ai_usage_logs", {
        user_id: userId,
        workspace_id: workspaceId,
        provider: "extension",
        model: extensionId,
        action: actionSlug,
        input_tokens: aiResult.inputTokens,
        output_tokens: aiResult.outputTokens,
        latency_ms: 0,
        estimated_cost_usd: 0,
        status: "success",
      });
    } catch {
      // silent fail on logging
    }

    return json({
      content: aiResult.content,
      balance: newBalance,
      creditsConsumed: creditCost,
    }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: msg }, 500);
  }
});

function json(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
