import { supabase } from './supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extension-action`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface ExtensionInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_premium: boolean;
  enabled: boolean;
}

export interface ExtensionActionInfo {
  id: number;
  extension_id: string;
  slug: string;
  name: string;
  description: string | null;
  credit_cost: number;
  enabled: boolean;
}

export interface EntitlementInfo {
  id: number;
  extension_id: string;
  status: string;
}

export interface CreditTransactionInfo {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export async function getExtensions(): Promise<ExtensionInfo[]> {
  const { data, error } = await supabase
    .from('extensions')
    .select('*')
    .eq('enabled', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []) as ExtensionInfo[];
}

export async function getExtensionActions(extensionId: string): Promise<ExtensionActionInfo[]> {
  const { data, error } = await supabase
    .from('extension_actions')
    .select('*')
    .eq('extension_id', extensionId)
    .eq('enabled', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as ExtensionActionInfo[];
}

export async function getEntitlements(workspaceId: string): Promise<EntitlementInfo[]> {
  const { data, error } = await supabase
    .from('entitlements')
    .select('id, extension_id, status')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []) as EntitlementInfo[];
}

export async function getCreditBalance(workspaceId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_credit_balance', { p_workspace_id: workspaceId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function getCreditTransactions(workspaceId: string, limit = 20): Promise<CreditTransactionInfo[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CreditTransactionInfo[];
}

export async function createTelegramPayment(
  workspaceId: string,
  plan: string,
  amount: number,
  reference: string
): Promise<void> {
  const { error } = await supabase.from('payments').insert({
    workspace_id: workspaceId,
    provider: 'telegram',
    type: 'subscription',
    amount,
    currency: 'USD',
    status: 'pending',
    reference,
  });
  if (error) throw error;
}

export interface ExtensionActionResult {
  content: string;
  balance: number;
  creditsConsumed: number;
}

export async function callExtensionAction(
  workspaceId: string,
  extensionId: string,
  actionSlug: string,
  context: { documentContent?: string; selection?: string },
  token?: string
): Promise<ExtensionActionResult> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ANON_KEY}`,
    },
    body: JSON.stringify({
      workspaceId,
      extensionId,
      actionSlug,
      documentContent: context.documentContent,
      selection: context.selection,
    }),
  });

  const data = await response.json().catch(() => ({ error: 'Unknown error' }));

  if (!response.ok) {
    throw new Error(data.error ?? `Action failed (${response.status})`);
  }

  return data as ExtensionActionResult;
}
