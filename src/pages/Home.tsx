import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenLine, Sparkles, ArrowRight, FileText, Clock,
  Sun, Moon, Settings as SettingsIcon, Shield,
  Plus, BookOpen, Mail, Linkedin, FileCode, MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import type { Document } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import GuestLanding from '@/components/GuestLanding';

const QUICK_TYPES = [
  { icon: <BookOpen size={16} />, label: 'Blog post' },
  { icon: <Mail size={16} />, label: 'Email' },
  { icon: <Linkedin size={16} />, label: 'LinkedIn post' },
  { icon: <FileCode size={16} />, label: 'Documentation' },
  { icon: <MessageSquare size={16} />, label: 'Essay' },
  { icon: <FileText size={16} />, label: 'Report' },
];

interface Props {
  session: Session | null;
  onOpenWorkspace: (doc: Partial<Document> & { isNew?: boolean; initialDescription?: string }) => void;
  onOpenStorytellers: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenExtensions: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onNavigate: (page: 'features' | 'usecases' | 'plans') => void;
  isAdmin?: boolean;
}

export default function Home({ session, onOpenWorkspace, onOpenStorytellers, onOpenSettings, onOpenAdmin, onOpenExtensions, onSignIn, onSignUp, onNavigate, isAdmin }: Props) {
  const { theme, toggle } = useTheme();
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const loadRecentDocs = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingDocs(true);
    try {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!ws) { setLoadingDocs(false); return; }
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', ws.id)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(6);
      if (data) setRecentDocs(data);
    } catch { /* ignore */ }
    finally { setLoadingDocs(false); }
  }, [session?.user?.id]);

  useEffect(() => { loadRecentDocs(); }, [loadRecentDocs]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleNewDraft() {
    onOpenWorkspace({ title: 'Untitled', isNew: true });
  }

  function handleOpenRecent(doc: Document) {
    onOpenWorkspace(doc);
  }

  if (!session) {
    return <GuestLanding onSignIn={onSignIn} onSignUp={onSignUp} onNavigate={onNavigate} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfbff] dark:bg-stone-950 flex flex-col transition-colors">
      {/* Nav */}
      <nav className={`flex items-center justify-between px-5 sm:px-8 py-4 sticky top-0 z-20 transition-all ${
        scrolled
          ? 'border-b border-[#e8e2f1] dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}>
        <div className="flex items-center gap-2">
          <img src="/wlogo.webp" alt="Writelab" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold text-[#34216f] dark:text-stone-100 tracking-tight">Writelab</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <button onClick={onOpenAdmin} className="flex items-center gap-1.5 text-sm font-medium text-[#7650a2] dark:text-stone-300 hover:text-[#34216f] dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-[#f0eafa] dark:hover:bg-stone-800 transition">
              <Shield size={14} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <button onClick={onOpenExtensions} className="flex items-center gap-1.5 text-sm font-medium text-[#7650a2] dark:text-stone-300 hover:text-[#34216f] dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-[#f0eafa] dark:hover:bg-stone-800 transition">
            <Sparkles size={14} />
            <span className="hidden sm:inline">Extensions</span>
          </button>
          <button onClick={onOpenSettings} className="flex items-center gap-1.5 text-sm font-medium text-[#7650a2] dark:text-stone-300 hover:text-[#34216f] dark:hover:text-stone-100 px-3 py-1.5 rounded-lg hover:bg-[#f0eafa] dark:hover:bg-stone-800 transition">
            <SettingsIcon size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button onClick={toggle} className="p-2 rounded-lg text-[#7650a2] hover:text-[#34216f] dark:hover:text-stone-100 hover:bg-[#f0eafa] dark:hover:bg-stone-800 transition">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      {/* Storytellers entry */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 pt-12 pb-12 sm:pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#f0eafa]/60 dark:bg-stone-800/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#e3d8f2]/40 dark:bg-stone-800/20 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e2f1] bg-[#f0eafa] px-3 py-1.5 text-[10px] font-medium text-[#7650a2] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 mb-5">
              <Sparkles size={11} className="text-[#d79bb6]" /> Storytellers
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#34216f] dark:text-stone-100 text-center leading-[1.1] tracking-tight mb-4">
              Every story starts with an idea.
            </h1>
            <p className="text-sm text-slate-500 dark:text-stone-400 max-w-md mx-auto">
              Tell us what you want to create. We'll help you shape it into something worth reading.
            </p>
          </div>

          {/* Primary CTA card */}
          <div className="bg-white dark:bg-stone-900 border border-[#e8e2f1] dark:border-stone-800 rounded-2xl shadow-lg shadow-[#34216f]/10 dark:shadow-none p-6 sm:p-8">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
              {QUICK_TYPES.map((qt) => (
                <div key={qt.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[#f5edf9] dark:bg-stone-800/50 text-center">
                  <span className="text-[#34216f] dark:text-stone-300">{qt.icon}</span>
                  <span className="text-[9px] font-medium text-[#7650a2] dark:text-stone-400 leading-tight">{qt.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenStorytellers}
              className="w-full flex items-center justify-center gap-2 bg-[#34216f] hover:bg-[#4e348d] text-white text-sm font-semibold py-3.5 rounded-xl transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <PenLine size={15} /> Start writing <ArrowRight size={14} />
            </button>
            <button
              onClick={handleNewDraft}
              className="w-full flex items-center justify-center gap-2 text-[#7650a2] dark:text-stone-400 text-sm font-medium py-2.5 mt-2 hover:text-[#34216f] dark:hover:text-stone-100 transition"
            >
              <FileText size={14} /> Or start with a blank draft
            </button>
          </div>
        </div>
      </div>

      {/* Recent documents */}
      {session && (recentDocs.length > 0 || loadingDocs) && (
        <div className="border-t border-[#e8e2f1] dark:border-stone-800 bg-white dark:bg-stone-900 py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 flex items-center gap-2">
                <Clock size={15} className="text-[#b07aa2]" />
                Recent documents
              </h2>
              <button
                onClick={handleNewDraft}
                className="flex items-center gap-1 text-xs font-medium text-[#7650a2] dark:text-stone-400 hover:text-[#34216f] dark:hover:text-stone-100 transition"
              >
                <Plus size={13} />
                New
              </button>
            </div>
            {loadingDocs ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-[#d79bb6] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleOpenRecent(doc)}
                    className="text-left p-4 rounded-xl border border-[#e8e2f1] dark:border-stone-800 hover:border-[#7650a2] dark:hover:border-stone-700 hover:bg-[#f5edf9] dark:hover:bg-stone-800/50 hover:shadow-md transition group"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <FileText size={14} className="text-[#b07aa2] flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-[#34216f] dark:text-stone-100 line-clamp-2 group-hover:text-[#5b3d8d] dark:group-hover:text-stone-300 transition">
                        {doc.title || 'Untitled'}
                      </span>
                    </div>
                    <p className="text-xs text-[#b07aa2] ml-5">
                      {doc.word_count > 0 ? `${doc.word_count} words` : 'Empty'} · {new Date(doc.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e8e2f1] dark:border-stone-800 bg-white dark:bg-stone-900 py-6 px-4 mt-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/wlogo.webp" alt="Writelab" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-[#34216f] dark:text-stone-100">Writelab</span>
          </div>
          <p className="text-xs text-[#b07aa2] dark:text-stone-500">Document-first AI writing</p>
        </div>
      </footer>
    </div>
  );
}
