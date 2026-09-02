import { useState, useEffect, useCallback } from 'react';
import {
  PenLine, ArrowLeft, LayoutDashboard, Key, Users, BarChart3,
  Settings as SettingsIcon, Loader2, Plus, Trash2, Check, AlertCircle,
  Eye, EyeOff, ChevronDown, Activity, DollarSign, Zap, TrendingUp,
  Sun, Moon, Shield, ShieldOff, CreditCard, HelpCircle, GripVertical,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import { PROVIDER_LABELS, PROVIDER_MODELS, type AIProvider, type AppSettings as AppSettingsType, type Profile, type SitePlan, type SiteFaq } from '@/lib/types';

interface Props {
  session: Session | null;
  onGoHome: () => void;
  onGoSettings: () => void;
}

type Tab = 'overview' | 'providers' | 'requests' | 'users' | 'plans' | 'settings';

interface UsageLog {
  id: string;
  user_id: string | null;
  provider: string;
  model: string;
  action: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface SystemCred {
  id: string;
  provider: string;
  name: string;
  api_key: string;
  base_url: string | null;
  default_model: string | null;
  is_enabled: boolean;
  created_at: string;
}

export default function Admin({ session, onGoHome, onGoSettings }: Props) {
  const { theme, toggle } = useTheme();
  const { profile } = useSettings(session?.user?.id);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [sysCreds, setSysCreds] = useState<SystemCred[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettingsType | null>(null);
  const [stats, setStats] = useState({ totalRequests: 0, totalCost: 0, totalTokens: 0, errorRate: 0, todayRequests: 0 });

  // Add system cred form
  const [showAddCred, setShowAddCred] = useState(false);
  const [newProvider, setNewProvider] = useState<AIProvider>('openai');
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newModel, setNewModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingCred, setSavingCred] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<AppSettingsType | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Plans management
  const [plans, setPlans] = useState<SitePlan[]>([]);
  const [faqs, setFaqs] = useState<SiteFaq[]>([]);
  const [savingPlans, setSavingPlans] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [credsRes, logsRes, usersRes, settingsRes, plansRes, faqsRes] = await Promise.all([
        supabase.from('ai_credentials').select('*').eq('owner_type', 'system').order('created_at', { ascending: false }),
        supabase.from('ai_usage_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('site_plans').select('*').order('sort_order'),
        supabase.from('site_faqs').select('*').order('sort_order'),
      ]);

      if (credsRes.data) setSysCreds(credsRes.data as SystemCred[]);
      if (logsRes.data) {
        setUsageLogs(logsRes.data as UsageLog[]);
        const logs = logsRes.data as UsageLog[];
        const totalCost = logs.reduce((s, l) => s + (l.estimated_cost_usd ?? 0), 0);
        const totalTokens = logs.reduce((s, l) => s + l.input_tokens + l.output_tokens, 0);
        const errors = logs.filter(l => l.status === 'error').length;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayReqs = logs.filter(l => new Date(l.created_at) >= today).length;
        setStats({
          totalRequests: logs.length,
          totalCost,
          totalTokens,
          errorRate: logs.length > 0 ? (errors / logs.length) * 100 : 0,
          todayRequests: todayReqs,
        });
      }
      if (usersRes.data) setUsers(usersRes.data as Profile[]);
      if (settingsRes.data) {
        setAppSettings(settingsRes.data as AppSettingsType);
        setSettingsForm(settingsRes.data as AppSettingsType);
      }
      if (plansRes.data) setPlans(plansRes.data as SitePlan[]);
      if (faqsRes.data) setFaqs(faqsRes.data as SiteFaq[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleAddSystemCred() {
    if (!newKey.trim()) return;
    setSavingCred(true);
    try {
      const { error } = await supabase.from('ai_credentials').insert({
        owner_type: 'system',
        provider: newProvider,
        api_key: newKey.trim(),
        name: newName.trim() || PROVIDER_LABELS[newProvider],
        base_url: newBaseUrl.trim() || null,
        default_model: newModel.trim() || null,
        is_enabled: true,
      });
      if (error) throw error;
      setShowAddCred(false);
      setNewKey(''); setNewName(''); setNewBaseUrl(''); setNewModel('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add system credential');
    } finally {
      setSavingCred(false);
    }
  }

  async function handleRemoveCred(id: string) {
    try {
      await supabase.from('ai_credentials').delete().eq('id', id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove credential');
    }
  }

  async function handleToggleCred(cred: SystemCred) {
    try {
      await supabase.from('ai_credentials').update({ is_enabled: !cred.is_enabled }).eq('id', cred.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle credential');
    }
  }

  async function handleSaveSettings() {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase.from('app_settings').update({
        default_provider: settingsForm.default_provider,
        default_model: settingsForm.default_model,
        allow_byok: settingsForm.allow_byok,
        allow_custom_providers: settingsForm.allow_custom_providers,
        maintenance_mode: settingsForm.maintenance_mode,
      }).eq('id', 1);
      if (error) throw error;
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleToggleAdmin(user: Profile) {
    try {
      await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }

  async function handleToggleDisabled(user: Profile) {
    try {
      await supabase.from('profiles').update({ is_disabled: !user.is_disabled }).eq('id', user.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }

  async function handleAddPlan() {
    setSavingPlans(true);
    try {
      const { error } = await supabase.from('site_plans').insert({
        name: 'New plan',
        tagline: '',
        price: '$0',
        period: 'forever',
        features: [],
        highlighted: false,
        sort_order: plans.length + 1,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add plan');
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleUpdatePlan(updated: SitePlan) {
    setSavingPlans(true);
    try {
      const { error } = await supabase.from('site_plans').update({
        name: updated.name,
        tagline: updated.tagline,
        price: updated.price,
        period: updated.period,
        features: updated.features,
        highlighted: updated.highlighted,
        sort_order: updated.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', updated.id);
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleDeletePlan(id: string) {
    try {
      await supabase.from('site_plans').delete().eq('id', id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  }

  async function handleAddFaq() {
    setSavingPlans(true);
    try {
      const { error } = await supabase.from('site_faqs').insert({
        question: 'New question',
        answer: '',
        sort_order: faqs.length + 1,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add FAQ');
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleUpdateFaq(updated: SiteFaq) {
    setSavingPlans(true);
    try {
      const { error } = await supabase.from('site_faqs').update({
        question: updated.question,
        answer: updated.answer,
        sort_order: updated.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', updated.id);
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ');
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleDeleteFaq(id: string) {
    try {
      await supabase.from('site_faqs').delete().eq('id', id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  }

  // Non-admin guard
  if (profile && !profile.is_admin) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-4">
        <Shield size={32} className="text-stone-300 dark:text-stone-600 mb-3" />
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Admin access required</p>
        <p className="text-xs text-stone-400 mb-4">You don't have permission to view this page.</p>
        <button onClick={onGoHome} className="text-sm text-stone-600 dark:text-stone-300 hover:underline">Back to home</button>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { id: 'providers', label: 'Providers', icon: <Key size={15} /> },
    { id: 'requests', label: 'Requests', icon: <BarChart3 size={15} /> },
    { id: 'users', label: 'Users', icon: <Users size={15} /> },
    { id: 'plans', label: 'Plans', icon: <CreditCard size={15} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={15} /> },
  ];

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
              <Shield size={14} className="text-white dark:text-stone-900" />
            </div>
            <span className="font-semibold text-stone-900 dark:text-stone-100">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGoSettings} className="text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            Settings
          </button>
          <button onClick={toggle} className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 w-full">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-stone-200 dark:border-stone-800 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.id
                  ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-stone-400" />
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={<Activity size={16} />} label="Total requests" value={stats.totalRequests.toLocaleString()} />
                  <StatCard icon={<TrendingUp size={16} />} label="Today" value={stats.todayRequests.toLocaleString()} />
                  <StatCard icon={<Zap size={16} />} label="Total tokens" value={stats.totalTokens.toLocaleString()} />
                  <StatCard icon={<DollarSign size={16} />} label="Est. cost" value={`$${stats.totalCost.toFixed(4)}`} />
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Recent activity</h3>
                  {usageLogs.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-8">No AI requests yet</p>
                  ) : (
                    <div className="space-y-2">
                      {usageLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm text-stone-700 dark:text-stone-300 truncate">
                              {PROVIDER_LABELS[log.provider as AIProvider] ?? log.provider} · {log.model}
                            </span>
                            <span className="text-xs text-stone-400 flex-shrink-0">{log.action}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-400 flex-shrink-0">
                            <span>{log.input_tokens + log.output_tokens} tok</span>
                            <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-2">System providers</h3>
                    <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{sysCreds.filter(c => c.is_enabled).length}</p>
                    <p className="text-xs text-stone-400 mt-1">active system credentials</p>
                  </div>
                  <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-2">Registered users</h3>
                    <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{users.length}</p>
                    <p className="text-xs text-stone-400 mt-1">{users.filter(u => u.is_admin).length} admin(s)</p>
                  </div>
                </div>
              </div>
            )}

            {/* PROVIDERS */}
            {tab === 'providers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">System AI Providers</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">API keys available to all users as fallback when BYOK is not configured</p>
                  </div>
                  {!showAddCred && (
                    <button onClick={() => setShowAddCred(true)} className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                      <Plus size={13} /> Add key
                    </button>
                  )}
                </div>

                {showAddCred && (
                  <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-3 bg-stone-50 dark:bg-stone-800/50">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Provider</label>
                      <div className="relative">
                        <select value={newProvider} onChange={(e) => { setNewProvider(e.target.value as AIProvider); setNewModel(''); }} className="w-full appearance-none px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition">
                          {Object.entries(PROVIDER_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">API Key</label>
                      <div className="relative">
                        <input type={showKey ? 'text' : 'password'} value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 pr-9 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                        <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      </div>
                    </div>
                    {newProvider === 'custom' && (
                      <div>
                        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Base URL</label>
                        <input value={newBaseUrl} onChange={(e) => setNewBaseUrl(e.target.value)} placeholder="https://api.your-provider.com/v1" className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Default model (optional)</label>
                      {PROVIDER_MODELS[newProvider].length > 0 ? (
                        <div className="relative">
                          <select value={newModel} onChange={(e) => setNewModel(e.target.value)} className="w-full appearance-none px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition">
                            <option value="">Provider default</option>
                            {PROVIDER_MODELS[newProvider].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                      ) : (
                        <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="model name" className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setShowAddCred(false); setNewKey(''); setNewName(''); setNewBaseUrl(''); setNewModel(''); }} className="flex-1 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition">Cancel</button>
                      <button onClick={handleAddSystemCred} disabled={savingCred || !newKey.trim()} className="flex-1 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {savingCred ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                      </button>
                    </div>
                  </div>
                )}

                {sysCreds.length === 0 && !showAddCred ? (
                  <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                    <Key size={24} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 dark:text-stone-400">No system providers configured</p>
                    <p className="text-xs text-stone-400 mt-1">Users will need to provide their own API keys</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sysCreds.map((cred) => (
                      <div key={cred.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Key size={14} className="text-stone-500 dark:text-stone-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                              {PROVIDER_LABELS[cred.provider as AIProvider] ?? cred.provider}
                              {!cred.is_enabled && <span className="text-stone-400 ml-2">· Disabled</span>}
                            </p>
                            <p className="text-xs text-stone-400">{cred.default_model ?? 'Provider default'} · {cred.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleCred(cred)} className="px-2.5 py-1 text-xs font-medium rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
                            {cred.is_enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => handleRemoveCred(cred.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REQUESTS */}
            {tab === 'requests' && (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                {usageLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 size={24} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 dark:text-stone-400">No requests logged yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-stone-200 dark:border-stone-800">
                        <tr className="text-left text-xs text-stone-400 uppercase tracking-wider">
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Provider</th>
                          <th className="px-4 py-3 font-medium">Model</th>
                          <th className="px-4 py-3 font-medium">Action</th>
                          <th className="px-4 py-3 font-medium text-right">Tokens</th>
                          <th className="px-4 py-3 font-medium text-right">Cost</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageLogs.map((log) => (
                          <tr key={log.id} className="border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                            <td className="px-4 py-3 text-xs text-stone-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-4 py-3 text-stone-700 dark:text-stone-300">{PROVIDER_LABELS[log.provider as AIProvider] ?? log.provider}</td>
                            <td className="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs">{log.model}</td>
                            <td className="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs">{log.action}</td>
                            <td className="px-4 py-3 text-right text-stone-500 dark:text-stone-400 text-xs">{log.input_tokens + log.output_tokens}</td>
                            <td className="px-4 py-3 text-right text-stone-500 dark:text-stone-400 text-xs">${log.estimated_cost_usd.toFixed(5)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={24} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 dark:text-stone-400">No users registered</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-stone-200 dark:border-stone-800">
                        <tr className="text-left text-xs text-stone-400 uppercase tracking-wider">
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Joined</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                            <td className="px-4 py-3">
                              <p className="font-medium text-stone-900 dark:text-stone-100">{u.display_name || 'Unnamed'}</p>
                              <p className="text-xs text-stone-400">{u.id.slice(0, 8)}...</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-stone-400">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.is_admin ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                                {u.is_admin ? 'Admin' : 'User'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.is_disabled ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'}`}>
                                {u.is_disabled ? 'Disabled' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <button onClick={() => handleToggleAdmin(u)} className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
                                {u.is_admin ? 'Remove admin' : 'Make admin'}
                              </button>
                              <button onClick={() => handleToggleDisabled(u)} className="text-xs text-stone-500 hover:text-red-500 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
                                {u.is_disabled ? 'Enable' : 'Disable'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {tab === 'settings' && settingsForm && (
              <div className="max-w-lg space-y-6">
                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Default AI Configuration</h2>

                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Default provider (used when no BYOK key is set)</label>
                    <div className="relative">
                      <select
                        value={settingsForm.default_provider ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, default_provider: e.target.value || null })}
                        className="w-full appearance-none px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                      >
                        <option value="">None</option>
                        {Object.entries(PROVIDER_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Default model</label>
                    <input
                      value={settingsForm.default_model ?? ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_model: e.target.value || null })}
                      placeholder="e.g. gpt-4o-mini"
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Toggle
                      label="Allow BYOK (bring your own key)"
                      desc="Let users add their own AI provider keys"
                      checked={settingsForm.allow_byok}
                      onChange={(v) => setSettingsForm({ ...settingsForm, allow_byok: v })}
                    />
                    <Toggle
                      label="Allow custom providers"
                      desc="Let users add OpenAI-compatible custom endpoints"
                      checked={settingsForm.allow_custom_providers}
                      onChange={(v) => setSettingsForm({ ...settingsForm, allow_custom_providers: v })}
                    />
                    <Toggle
                      label="Maintenance mode"
                      desc="Block all AI requests and show a maintenance message"
                      checked={settingsForm.maintenance_mode}
                      onChange={(v) => setSettingsForm({ ...settingsForm, maintenance_mode: v })}
                    />
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="w-full py-2.5 text-sm font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {savingSettings ? <Loader2 size={14} className="animate-spin" /> : settingsSaved ? <Check size={14} /> : null}
                    {settingsSaved ? 'Saved' : 'Save settings'}
                  </button>
                </div>
              </div>
            )}

            {/* PLANS */}
            {tab === 'plans' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-stone-500 dark:text-stone-400" />
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Pricing plans</h3>
                    </div>
                    <button onClick={handleAddPlan} disabled={savingPlans} className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-50">
                      <Plus size={13} /> Add plan
                    </button>
                  </div>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div key={plan.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Name</label>
                            <input value={plan.name} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, name: e.target.value } : p))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Tagline</label>
                            <input value={plan.tagline} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, tagline: e.target.value } : p))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Price</label>
                            <input value={plan.price} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, price: e.target.value } : p))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Period</label>
                            <input value={plan.period} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, period: e.target.value } : p))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Sort order</label>
                            <input type="number" value={plan.sort_order} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300 cursor-pointer">
                              <input type="checkbox" checked={plan.highlighted} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, highlighted: e.target.checked } : p))} className="rounded" />
                              Highlight as popular
                            </label>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Features (one per line)</label>
                          <textarea value={plan.features.join('\n')} onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, features: e.target.value.split('\n').filter(f => f.trim()) } : p))} rows={4} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition resize-none" />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => handleDeletePlan(plan.id)} className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                            <Trash2 size={12} /> Delete
                          </button>
                          <button onClick={() => handleUpdatePlan(plan)} disabled={savingPlans} className="flex items-center gap-1 text-xs font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50">
                            {savingPlans ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                          </button>
                        </div>
                      </div>
                    ))}
                    {plans.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No plans yet</p>}
                  </div>
                </div>

                <div className="border-t border-stone-200 dark:border-stone-800 pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={18} className="text-stone-500 dark:text-stone-400" />
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">FAQ</h3>
                    </div>
                    <button onClick={handleAddFaq} disabled={savingPlans} className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-50">
                      <Plus size={13} /> Add FAQ
                    </button>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Question</label>
                            <input value={faq.question} onChange={(e) => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f))} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Answer</label>
                            <textarea value={faq.answer} onChange={(e) => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f))} rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Sort order</label>
                            <input type="number" value={faq.sort_order} onChange={(e) => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, sort_order: parseInt(e.target.value) || 0 } : f))} className="w-32 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => handleDeleteFaq(faq.id)} className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                            <Trash2 size={12} /> Delete
                          </button>
                          <button onClick={() => handleUpdateFaq(faq)} disabled={savingPlans} className="flex items-center gap-1 text-xs font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50">
                            {savingPlans ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                          </button>
                        </div>
                      </div>
                    ))}
                    {faqs.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No FAQs yet</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
      <div className="flex items-center gap-2 text-stone-400 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{label}</p>
        <p className="text-xs text-stone-400">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${checked ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
