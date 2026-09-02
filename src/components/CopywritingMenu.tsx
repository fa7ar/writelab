import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Lock, Sparkles, Zap } from 'lucide-react';
import {
  getExtensionActions,
  getEntitlements,
  getCreditBalance,
  callExtensionAction,
  type ExtensionActionInfo,
} from '@/lib/extensions';
import type { Session } from '@supabase/supabase-js';

interface Props {
  workspaceId: string;
  session: Session | null;
  disabled?: boolean;
  getSelection: () => string;
  getDocumentContent: () => string;
  onInsertContent: (text: string) => void;
  onOpenExtensions: () => void;
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  aida: 'Attention → Interest → Desire → Action',
  pas: 'Problem → Agitate → Solution',
  bab: 'Before → After → Bridge',
  fab: 'Features → Advantages → Benefits',
  '4p': 'Promise → Picture → Proof → Push',
};

export default function CopywritingMenu({
  workspaceId, session, disabled, getSelection, getDocumentContent, onInsertContent, onOpenExtensions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState<ExtensionActionInfo[]>([]);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [acts, ents, bal] = await Promise.all([
        getExtensionActions('copywriting'),
        getEntitlements(workspaceId),
        getCreditBalance(workspaceId),
      ]);
      setActions(acts);
      setHasEntitlement(ents.some((e) => e.extension_id === 'copywriting' && e.status === 'active'));
      setBalance(bal);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleRunAction(action: ExtensionActionInfo) {
    if (runningAction) return;
    setError('');
    setRunningAction(action.slug);

    try {
      const result = await callExtensionAction(
        workspaceId,
        'copywriting',
        action.slug,
        {
          selection: getSelection(),
          documentContent: getDocumentContent(),
        },
        session?.access_token
      );

      onInsertContent(result.content);
      setBalance(result.balance);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      if (msg.includes('EXTENSION_LOCKED')) {
        setError('Unlock the Copywriting extension to use this feature.');
      } else if (msg.includes('INSUFFICIENT_CREDITS')) {
        setError(`Not enough credits. This action costs ${action.credit_cost} credits. Buy more in Extensions.`);
      } else {
        setError(msg);
      }
    } finally {
      setRunningAction(null);
    }
  }

  const isLocked = !hasEntitlement;
  const canAfford = (cost: number) => balance >= cost;

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title="Copywriting"
        aria-label="Copywriting"
        className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Copywriting Frameworks</span>
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-amber-500" />
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{balance} credits</span>
              </div>
            </div>
          </div>

          {/* Locked state */}
          {isLocked && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Lock size={13} />
                <span className="text-xs font-medium">Premium extension — unlock to use</span>
              </div>
              <button
                onClick={() => { setOpen(false); onOpenExtensions(); }}
                className="mt-2 w-full py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
              >
                Unlock Copywriting
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              {(error.includes('credits') || error.includes('Unlock')) && (
                <button
                  onClick={() => { setOpen(false); onOpenExtensions(); }}
                  className="text-xs font-medium text-red-700 dark:text-red-300 underline mt-1"
                >
                  Go to Extensions
                </button>
              )}
            </div>
          )}

          {/* Actions list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-stone-300" />
              </div>
            ) : (
              actions.map((action) => {
                const affordable = canAfford(action.credit_cost);
                const isRunning = runningAction === action.slug;
                return (
                  <button
                    key={action.slug}
                    onClick={() => handleRunAction(action)}
                    disabled={isRunning || (!affordable && !isLocked)}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed border-b border-stone-50 dark:border-stone-800/50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {action.name}
                        </div>
                        <div className="text-xs text-stone-400 dark:text-stone-500 truncate">
                          {ACTION_DESCRIPTIONS[action.slug] ?? action.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isRunning ? (
                          <Loader2 size={13} className="animate-spin text-stone-400" />
                        ) : (
                          <span className={`text-xs font-medium ${affordable ? 'text-amber-600 dark:text-amber-400' : 'text-stone-300 dark:text-stone-600'}`}>
                            {action.credit_cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30">
            <button
              onClick={() => { setOpen(false); onOpenExtensions(); }}
              className="w-full text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition"
            >
              Manage extensions & credits
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
