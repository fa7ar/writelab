import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenLine, Sparkles, ArrowRight, Loader2, FileText,
  Wand2, BookOpen, Mail, Linkedin, FileCode, MessageSquare,
  AlertCircle, Sun, Moon, Settings as SettingsIcon, Shield,
  Plus, Clock,
} from 'lucide-react';
import { callAI, plainTextToContent } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import type { Document } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import GuestLanding from '@/components/GuestLanding';

const WRITING_TYPES = [
  { icon: <BookOpen size={14} />, label: 'Blog post', prompt: 'a blog post about ' },
  { icon: <Mail size={14} />, label: 'Email', prompt: 'a professional email about ' },
  { icon: <Linkedin size={14} />, label: 'LinkedIn post', prompt: 'a LinkedIn post about ' },
  { icon: <FileCode size={14} />, label: 'Documentation', prompt: 'technical documentation for ' },
  { icon: <MessageSquare size={14} />, label: 'Essay', prompt: 'a thoughtful essay about ' },
  { icon: <FileText size={14} />, label: 'Report', prompt: 'a report on ' },
];

const TONES = ['Professional', 'Casual', 'Conversational', 'Persuasive', 'Technical'];

interface Props {
  session: Session | null;
  onOpenWorkspace: (doc: Partial<Document> & { isNew?: boolean; initialDescription?: string }) => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenExtensions: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onNavigate: (page: 'features' | 'usecases' | 'plans') => void;
  isAdmin?: boolean;
}

export default function Home({ session, onOpenWorkspace, onOpenSettings, onOpenAdmin, onOpenExtensions, onSignIn, onSignUp, onNavigate, isAdmin }: Props) {
  const { theme, toggle } = useTheme();
  const [description, setDescription] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [showStyle, setShowStyle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }

  function applyPromptType(prompt: string) {
    setDescription((prev) => {
      const cleaned = prev.replace(/^(a blog post about|a professional email about|a LinkedIn post about|technical documentation for|a thoughtful essay about|a report on)\s*/i, '');
      return prompt + cleaned;
    });
    textareaRef.current?.focus();
  }

  async function handleGenerate() {
    if (!description.trim() || generating) return;
    setError('');
    setGenerating(true);

    try {
      const instruction = selectedTone
        ? `${description}. Use a ${selectedTone.toLowerCase()} tone.`
        : description;

      const res = await callAI(
        { action: 'write', instruction },
        session?.access_token
      );

      const titleMatch = res.content.match(/^#+ (.+)/m) ?? res.content.match(/^(.{10,80})/);
      const title = titleMatch ? titleMatch[1].replace(/^#+ /, '').trim() : description.slice(0, 60);
      const body = res.content.replace(/^#+ .+\n*/m, '').trim();
      const content = plainTextToContent(body || res.content);

      onOpenWorkspace({
        title,
        content,
        plain_text: body || res.content,
        word_count: (body || res.content).trim().split(/\s+/).length,
        isNew: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setGenerating(false);
    }
  }

  function handleNewDraft() {
    const title = description.trim() || 'Untitled';
    onOpenWorkspace({ title, isNew: true });
  }

  function handleOpenRecent(doc: Document) {
    onOpenWorkspace(doc);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
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

      {/* Generator */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-12 sm:pt-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#f0eafa]/60 dark:bg-stone-800/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#e3d8f2]/40 dark:bg-stone-800/20 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">
          <h1 className="text-3xl sm:text-5xl font-bold text-[#34216f] dark:text-stone-100 text-center leading-[1.1] tracking-tight mb-8">
            Start Writing Now
          </h1>

          {error && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">AI isn't configured yet</p>
                <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
                  {error.includes('No API key') || error.includes('No AI provider')
                    ? 'Go to Settings and add your AI provider API key to start writing with AI.'
                    : error}
                </p>
                <button onClick={onOpenSettings} className="text-xs font-medium text-amber-900 dark:text-amber-200 underline mt-1.5">
                  Open Settings
                </button>
              </div>
            </div>
          )}

          {/* Input card */}
          <div className="bg-white dark:bg-stone-900 border border-[#e8e2f1] dark:border-stone-800 rounded-2xl shadow-lg shadow-[#34216f]/10 dark:shadow-none overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-[#f0eafa] dark:border-stone-800">
              <div className="flex flex-wrap gap-2">
                {WRITING_TYPES.map((wt) => (
                  <button
                    key={wt.label}
                    onClick={() => applyPromptType(wt.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5edf9] dark:bg-stone-800 hover:bg-[#f0eafa] dark:hover:bg-stone-700 border border-[#e8e2f1] dark:border-stone-700 rounded-lg text-xs text-[#5b3d8d] dark:text-stone-300 font-medium transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {wt.icon}
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-4">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => { setDescription(e.target.value); autoResize(); }}
                onKeyDown={handleKey}
                placeholder="Tell me what you want to create... e.g. a blog post about the future of remote work for tech teams"
                rows={3}
                className="w-full resize-none text-slate-800 dark:text-stone-100 text-base placeholder:text-slate-400 dark:placeholder:text-stone-500 outline-none leading-relaxed bg-transparent"
                style={{ fontFamily: 'inherit' }}
              />
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setShowStyle(!showStyle)}
                className="text-xs text-[#b07aa2] dark:text-stone-500 hover:text-[#34216f] dark:hover:text-stone-300 transition flex items-center gap-1"
              >
                <Wand2 size={11} />
                {showStyle ? 'Hide style options' : 'Add writing style'}
              </button>
              {showStyle && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setSelectedTone(selectedTone === tone ? '' : tone)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        selectedTone === tone
                          ? 'bg-[#34216f] dark:bg-stone-100 text-white dark:text-stone-900 border-[#34216f] dark:border-stone-100'
                          : 'bg-white dark:bg-stone-900 text-[#5b3d8d] dark:text-stone-300 border-[#e8e2f1] dark:border-stone-700 hover:border-[#7650a2] dark:hover:border-stone-500'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-[#fcfbff] dark:bg-stone-800/50 border-t border-[#f0eafa] dark:border-stone-800 flex items-center justify-between gap-3">
              <button
                onClick={handleNewDraft}
                className="flex items-center gap-1.5 text-sm text-[#7650a2] dark:text-stone-400 hover:text-[#34216f] dark:hover:text-stone-100 font-medium transition"
              >
                <FileText size={14} />
                New blank draft
              </button>
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || generating}
                className="flex items-center gap-2 bg-[#34216f] dark:bg-stone-100 hover:bg-[#4e348d] dark:hover:bg-stone-200 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white dark:text-stone-900 text-sm font-medium px-5 py-2.5 rounded-xl transition disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-[#b07aa2] dark:text-stone-500 mt-4">
            Cmd/Ctrl + Enter to generate &nbsp;·&nbsp; No prompts, no settings needed
          </p>
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
                <Loader2 size={16} className="animate-spin text-[#d79bb6]" />
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
