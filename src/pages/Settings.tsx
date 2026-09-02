import { useState } from 'react';
import {
  PenLine, ArrowLeft, Key, Plus, Trash2, Check, Loader2,
  Sun, Moon, User, AlertCircle, Eye, EyeOff, ChevronDown,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { PROVIDER_LABELS, PROVIDER_MODELS, type AIProvider, type CredentialInfo } from '@/lib/types';

interface Props {
  session: Session | null;
  onGoHome: () => void;
  onOpenAdmin: () => void;
}

export default function Settings({ session, onGoHome, onOpenAdmin }: Props) {
  const userId = session?.user?.id;
  const { profile, credentials, loading, addCredential, removeCredential, updateProfile } = useSettings(userId);
  const { theme, toggle } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState<AIProvider>('openai');
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newModel, setNewModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  async function handleAddCredential() {
    if (!newKey.trim()) { setError('API key is required'); return; }
    setError('');
    setSaving(true);
    try {
      await addCredential(newProvider, newKey.trim(), newName.trim() || undefined, newBaseUrl.trim() || undefined, newModel.trim() || undefined);
      setNewKey(''); setNewName(''); setNewBaseUrl(''); setNewModel('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveCredential(id: string) {
    try {
      await removeCredential(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove key');
    }
  }

  async function handleSaveProfile() {
    if (!userId) return;
    try {
      await updateProfile({ display_name: displayName });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition">
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="w-px h-5 bg-stone-200 dark:bg-stone-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 dark:bg-stone-100 rounded-lg flex items-center justify-center">
              <PenLine size={14} className="text-white dark:text-stone-900" />
            </div>
            <span className="font-semibold text-stone-900 dark:text-stone-100">Settings</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.is_admin && (
            <button onClick={onOpenAdmin} className="text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              Admin Panel
            </button>
          )}
          <button onClick={toggle} className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Profile section */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-stone-500 dark:text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Display name</label>
              <div className="flex gap-2">
                <input
                  value={displayName || (profile?.display_name ?? '')}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {profileSaved ? <Check size={14} /> : null}
                  {profileSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
            <p className="text-xs text-stone-400">{session?.user?.email}</p>
          </div>
        </section>

        {/* AI Provider Keys */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-stone-500 dark:text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">AI Provider Keys</h2>
            </div>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                <Plus size={13} />
                Add key
              </button>
            )}
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
            Bring your own API key (BYOK). Your key is stored securely and used only to call the AI provider you choose. You can remove it at any time.
          </p>

          {/* Add credential form */}
          {showAdd && (
            <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 mb-4 space-y-3 bg-stone-50 dark:bg-stone-800/50">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Provider</label>
                <div className="relative">
                  <select
                    value={newProvider}
                    onChange={(e) => { setNewProvider(e.target.value as AIProvider); setNewModel(''); }}
                    className="w-full appearance-none px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                  >
                    {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {(newProvider === 'custom') && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Base URL (for custom OpenAI-compatible providers)</label>
                  <input
                    value={newBaseUrl}
                    onChange={(e) => setNewBaseUrl(e.target.value)}
                    placeholder="https://api.your-provider.com/v1"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Default model {PROVIDER_MODELS[newProvider].length > 0 && '(optional)'}</label>
                {PROVIDER_MODELS[newProvider].length > 0 ? (
                  <div className="relative">
                    <select
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full appearance-none px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                    >
                      <option value="">Provider default</option>
                      {PROVIDER_MODELS[newProvider].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="e.g. gpt-4o-mini"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Label (optional)</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Work OpenAI key"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowAdd(false); setError(''); setNewKey(''); setNewName(''); setNewBaseUrl(''); setNewModel(''); }}
                  className="flex-1 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCredential}
                  disabled={saving || !newKey.trim()}
                  className="flex-1 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save key
                </button>
              </div>
            </div>
          )}

          {/* Credential list */}
          {credentials.length === 0 && !showAdd ? (
            <div className="text-center py-8">
              <Key size={24} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400">No API keys configured yet</p>
              <p className="text-xs text-stone-400 mt-1">Add a provider key to start writing with AI</p>
            </div>
          ) : (
            <div className="space-y-2">
              {credentials.map((cred: CredentialInfo) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-stone-200 dark:bg-stone-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key size={14} className="text-stone-500 dark:text-stone-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {PROVIDER_LABELS[cred.provider as AIProvider] ?? cred.provider}
                        {cred.name && <span className="text-stone-400 font-normal ml-1.5">· {cred.name}</span>}
                      </p>
                      <p className="text-xs text-stone-400">
                        {cred.default_model ?? 'Provider default model'}
                        {!cred.is_enabled && ' · Disabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCredential(cred.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Appearance */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon size={18} className="text-stone-400" /> : <Sun size={18} className="text-stone-500" />}
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Appearance</h2>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              {theme === 'dark' ? <><Sun size={14} /> Light mode</> : <><Moon size={14} /> Dark mode</>}
            </button>
          </div>
        </section>

        {/* Sign out */}
        <section className="pt-2">
          <button
            onClick={async () => { await supabase.auth.signOut(); onGoHome(); }}
            className="text-sm text-stone-400 hover:text-red-500 transition"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
