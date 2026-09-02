import { useState, useEffect, useCallback } from 'react';
import {
  PenLine, ChevronLeft, Zap, Sparkles, Lock, Check, Loader2,
  CreditCard, History, Send, ArrowRight, AlertCircle, Sun, Moon,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import {
  getExtensions, getExtensionActions, getEntitlements, getCreditBalance,
  getCreditTransactions, createTelegramPayment,
  type ExtensionInfo, type ExtensionActionInfo, type CreditTransactionInfo,
} from '@/lib/extensions';

interface Props {
  session: Session | null;
  workspaceId: string;
  onGoHome: () => void;
  onGoWorkspace: () => void;
}

const CREDIT_PACKS = [
  { credits: 50, price: 5, label: 'Starter' },
  { credits: 150, price: 12, label: 'Popular', popular: true },
  { credits: 500, price: 35, label: 'Pro' },
];

type Tab = 'extensions' | 'credits' | 'history';

export default function Extensions({ session, workspaceId, onGoHome, onGoWorkspace }: Props) {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('extensions');
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [actions, setActions] = useState<Record<string, ExtensionActionInfo[]>>({});
  const [entitlements, setEntitlements] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransactionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [exts, ents, bal] = await Promise.all([
        getExtensions(),
        getEntitlements(workspaceId),
        getCreditBalance(workspaceId),
      ]);
      setExtensions(exts);
      setEntitlements(new Set(ents.filter((e) => e.status === 'active').map((e) => e.extension_id)));
      setBalance(bal);

      const actionMap: Record<string, ExtensionActionInfo[]> = {};
      for (const ext of exts) {
        actionMap[ext.id] = await getExtensionActions(ext.id);
      }
      setActions(actionMap);

      const txs = await getCreditTransactions(workspaceId, 30);
      setTransactions(txs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleUnlockExtension(ext: ExtensionInfo) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertError } = await supabase.from('entitlements').insert({
        workspace_id: workspaceId,
        extension_id: ext.id,
        status: 'active',
      });
      if (insertError) {
        if (insertError.code === '23505') {
          // Already exists — update to active
          await supabase.from('entitlements')
            .update({ status: 'active' })
            .eq('workspace_id', workspaceId)
            .eq('extension_id', ext.id);
        } else {
          throw insertError;
        }
      }
      setEntitlements((prev) => new Set([...prev, ext.id]));
      setSuccess(`${ext.name} unlocked! You can now use it in the editor.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock extension');
    } finally {
      setBusy(false);
    }
  }

  async function handleBuyCredits(pack: typeof CREDIT_PACKS[0]) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const reference = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createTelegramPayment(workspaceId, `credit_pack_${pack.credits}`, pack.price, reference);

      // Grant credits immediately (demo flow — in production, webhook would verify payment first)
      const { data: newBalance } = await supabase.rpc('grant_credits', {
        p_workspace_id: workspaceId,
        p_amount: pack.credits,
        p_type: 'purchase',
        p_description: `Purchased ${pack.credits} credits (${pack.label})`,
      });

      if (typeof newBalance === 'number') setBalance(newBalance);
      setSuccess(`${pack.credits} credits added to your account!`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase credits');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition">
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Home</span>
          </button>
          <div className="w-px h-5 bg-stone-200 dark:bg-stone-700" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 dark:bg-stone-100 rounded-lg flex items-center justify-center">
              <PenLine size={15} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Extensions</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
            <Zap size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{balance}</span>
            <span className="text-xs text-amber-600 dark:text-amber-500 hidden sm:inline">credits</span>
          </div>
          <button onClick={onGoWorkspace} className="text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition hidden sm:block">
            Back to editor
          </button>
          <button onClick={toggle} className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-100 dark:bg-stone-800/50 rounded-xl p-1 w-fit">
          {([
            { id: 'extensions' as const, label: 'Extensions', icon: <Sparkles size={14} /> },
            { id: 'credits' as const, label: 'Buy Credits', icon: <CreditCard size={14} /> },
            { id: 'history' as const, label: 'History', icon: <History size={14} /> },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl px-4 py-3 mb-4">
            <Check size={15} className="flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        {/* Extensions tab */}
        {tab === 'extensions' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-stone-300" />
              </div>
            ) : extensions.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles size={32} className="text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                <p className="text-sm text-stone-400">No extensions available yet.</p>
              </div>
            ) : (
              extensions.map((ext) => {
                const unlocked = entitlements.has(ext.id);
                const extActions = actions[ext.id] ?? [];
                return (
                  <div
                    key={ext.id}
                    className={`bg-white dark:bg-stone-900 border rounded-2xl overflow-hidden transition ${
                      unlocked
                        ? 'border-stone-200 dark:border-stone-800'
                        : 'border-stone-200 dark:border-stone-800 shadow-md'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{ext.name}</h3>
                            {ext.is_premium && (
                              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                                <Sparkles size={10} /> Premium
                              </span>
                            )}
                            {unlocked && (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
                            {ext.description}
                          </p>

                          {/* Actions preview */}
                          {extActions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {extActions.map((a) => (
                                <span
                                  key={a.slug}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md"
                                >
                                  {a.name}
                                  <Zap size={9} className="text-amber-500" />
                                  {a.credit_cost}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {!unlocked && ext.is_premium && (
                          <button
                            onClick={() => handleUnlockExtension(ext)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition disabled:opacity-50 flex-shrink-0"
                          >
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Credits tab */}
        {tab === 'credits' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap size={26} className="text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{balance}</p>
              <p className="text-sm text-stone-400 mt-1">Available credits</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.label}
                  className={`bg-white dark:bg-stone-900 border rounded-2xl p-5 relative transition ${
                    pack.popular
                      ? 'border-stone-900 dark:border-stone-100 shadow-lg'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium px-3 py-0.5 rounded-full">
                      Best value
                    </span>
                  )}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Zap size={18} className="text-amber-500" />
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">{pack.credits}</span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">credits</p>
                    <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-3">${pack.price}</div>
                    <button
                      onClick={() => handleBuyCredits(pack)}
                      disabled={busy}
                      className={`w-full py-2.5 text-sm font-medium rounded-xl transition disabled:opacity-50 ${
                        pack.popular
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {busy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Buy now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-stone-100 dark:bg-stone-800/30 rounded-xl p-4 flex items-start gap-2.5">
              <Send size={16} className="text-stone-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Payments are processed via Telegram Stars or Paddle. Credits are added to your workspace balance
                and can be used across all extensions. Each AI action consumes credits based on its complexity.
              </p>
            </div>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-stone-300" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <History size={28} className="text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                <p className="text-sm text-stone-400">No transactions yet.</p>
                <p className="text-xs text-stone-300 dark:text-stone-600 mt-1">Buy credits or unlock extensions to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tx.amount > 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : 'bg-stone-100 dark:bg-stone-800'
                      }`}>
                        <Zap size={14} className={tx.amount > 0 ? 'text-emerald-500' : 'text-stone-400'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {tx.description || tx.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-stone-400">
                          {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                      <p className="text-xs text-stone-400">Bal: {tx.balance_after}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
