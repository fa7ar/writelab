import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, PenLine } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/lib/supabase';
import AuthPage from '@/components/AuthPage';
import Home from '@/pages/Home';
import Workspace from '@/pages/Workspace';
import Settings from '@/pages/Settings';
import Extensions from '@/pages/Extensions';
import Admin from '@/pages/Admin';
import Marketing from '@/pages/Marketing';
import Storytellers, { type StorytellersConfig } from '@/components/Storytellers';
import type { Document, Profile } from '@/lib/types';
import { plainTextToContent, callAI } from '@/lib/ai';

type View = 'loading' | 'auth' | 'home' | 'storytellers' | 'workspace' | 'settings' | 'admin' | 'extensions' | 'features' | 'usecases' | 'plans';

const EMPTY_CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] };

export default function App() {
  const { user, session, loading: authLoading } = useAuth();
  const { workspace, documents, loading: wsLoading, createDocument, updateDocument, deleteDocument } = useWorkspace(user?.id);
  const [view, setView] = useState<View>('loading');
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pendingStory, setPendingStory] = useState<{ config: StorytellersConfig; generate: boolean } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ content: Record<string, unknown>; plain: string; words: number } | null>(null);

  // Load profile for admin check
  useEffect(() => {
    if (!user?.id) { setProfile(null); return; }
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
    });
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) { setView('loading'); return; }
    if (!user) { setView('home'); return; }
    if (wsLoading) { setView('loading'); return; }
    if (view === 'loading' || view === 'auth') setView('home');
  }, [authLoading, user, wsLoading]);

  const openDocument = useCallback((doc: Document) => {
    setActiveDoc(doc);
    setView('workspace');
  }, []);

  async function handleNewDocumentFromHome(draft: Partial<Document> & { isNew?: boolean }) {
    if (!workspace) return;
    const content = (draft.content as Record<string, unknown>) ?? EMPTY_CONTENT;
    const plain = draft.plain_text ?? '';
    const words = draft.word_count ?? 0;
    const title = draft.title ?? 'Untitled';

    try {
      const doc = await createDocument(title, content, plain);
      if (doc) {
        setActiveDoc({ ...doc, word_count: words });
        setView('workspace');
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  }

  function handleStorytellersOpen(config: StorytellersConfig, generate: boolean) {
    setPendingStory({ config, generate });
    setGenerating(false);
    setView('loading');
  }

  async function processPendingStory() {
    if (!pendingStory || !workspace) return;
    const { config, generate } = pendingStory;
    setGenerating(true);

    const title = config.workingTitle || config.topic.slice(0, 60) || config.writingTypeLabel || 'Untitled';

    try {
      let content = EMPTY_CONTENT;
      let plain = '';
      let words = 0;

      if (generate) {
        const instruction = buildStoryInstruction(config);
        const res = await callAI({ action: 'write', instruction, workspaceId: workspace.id }, session?.access_token);
        const titleMatch = res.content.match(/^#+ (.+)/m) ?? res.content.match(/^(.{10,80})/);
        const genTitle = titleMatch ? titleMatch[1].replace(/^#+ /, '').trim() : title;
        const body = res.content.replace(/^#+ .+\n*/m, '').trim();
        plain = body || res.content;
        words = plain.trim().split(/\s+/).length;
        content = plainTextToContent(plain);
        const doc = await createDocument(genTitle, content, plain);
        if (doc) {
          setActiveDoc({ ...doc, word_count: words });
          setPendingStory(null);
          setGenerating(false);
          setView('workspace');
          return;
        }
      } else {
        const doc = await createDocument(title, content, plain);
        if (doc) {
          setActiveDoc({ ...doc, word_count: words });
          setPendingStory(null);
          setGenerating(false);
          setView('workspace');
          return;
        }
      }
    } catch (err) {
      console.error('Storytellers generation failed:', err);
      setGenerating(false);
      setView('home');
    }

    setPendingStory(null);
  }

  useEffect(() => {
    if (pendingStory && workspace && view === 'loading') {
      processPendingStory();
    }
  }, [pendingStory, workspace, view]);

  async function handleNewBlankDocument() {
    if (!workspace) return;
    try {
      const doc = await createDocument('Untitled', EMPTY_CONTENT, '');
      if (doc) { openDocument(doc); }
    } catch (err) {
      console.error(err);
    }
  }

  function handleContentChange(
    id: string,
    content: Record<string, unknown>,
    plain: string,
    words: number
  ) {
    setActiveDoc((prev) => prev?.id === id ? { ...prev, content, plain_text: plain, word_count: words } : prev);
    pendingSave.current = { content, plain, words };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(false);
    saveTimer.current = setTimeout(async () => {
      const s = pendingSave.current;
      if (!s) return;
      setSaving(true);
      try {
        await updateDocument(id, { content: s.content, plain_text: s.plain, word_count: s.words });
      } finally {
        setSaving(false);
        pendingSave.current = null;
      }
    }, 1500);
  }

  async function handleTitleChange(id: string, title: string) {
    setActiveDoc((prev) => prev?.id === id ? { ...prev, title } : prev);
    try {
      await updateDocument(id, { title });
    } catch (err) {
      console.error(err);
    }
  }

  function handleSelectDocument(doc: Document) {
    setActiveDoc(doc);
    setView('workspace');
  }

  async function handleDeleteDocument(id: string) {
    await deleteDocument(id);
    if (activeDoc?.id === id) {
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        setActiveDoc(remaining[0]);
      } else {
        setActiveDoc(null);
        setView('home');
      }
    }
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-[#fcfbff] dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/wlogo.webp" alt="Writelab" className="h-10 w-10 object-contain" />
          {generating ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={18} className="animate-spin text-[#b07aa2]" />
              <p className="text-xs text-[#7650a2] dark:text-stone-400">Drafting your story...</p>
            </div>
          ) : (
            <Loader2 size={18} className="animate-spin text-[#b07aa2]" />
          )}
        </div>
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthPage onAuthenticated={() => setView('home')} />;
  }

  if (view === 'features' || view === 'usecases' || view === 'plans') {
    return <Marketing page={view} onBack={() => setView('home')} onSignUp={() => setView('auth')} onSignIn={() => setView('auth')} />;
  }

  if (view === 'settings') {
    return (
      <Settings
        session={session}
        onGoHome={() => setView('home')}
        onOpenAdmin={() => setView('admin')}
      />
    );
  }

  if (view === 'extensions' && workspace) {
    return (
      <Extensions
        session={session}
        workspaceId={workspace.id}
        onGoHome={() => setView('home')}
        onGoWorkspace={() => setView('workspace')}
      />
    );
  }

  if (view === 'admin') {
    return (
      <Admin
        session={session}
        onGoHome={() => setView('home')}
        onGoSettings={() => setView('settings')}
      />
    );
  }

  if (view === 'storytellers') {
    return (
      <Storytellers
        onOpenEditor={handleStorytellersOpen}
        onBlankDraft={handleNewBlankDocument}
      />
    );
  }

  if (view === 'home') {
    return (
      <Home
        session={session}
        onOpenWorkspace={handleNewDocumentFromHome}
        onOpenStorytellers={() => setView('storytellers')}
        onOpenSettings={() => setView('settings')}
        onOpenAdmin={() => setView('admin')}
        onOpenExtensions={() => setView('extensions')}
        onSignIn={() => setView('auth')}
        onSignUp={() => setView('auth')}
        onNavigate={(page) => setView(page)}
        isAdmin={profile?.is_admin ?? false}
      />
    );
  }

  if (view === 'workspace' && workspace) {
    return (
      <Workspace
        workspace={workspace}
        documents={documents}
        activeDocument={activeDoc}
        session={session}
        saving={saving}
        onGoHome={() => setView('home')}
        onOpenSettings={() => setView('settings')}
        onOpenExtensions={() => setView('extensions')}
        onSelectDocument={handleSelectDocument}
        onNewDocument={handleNewBlankDocument}
        onDeleteDocument={handleDeleteDocument}
        onContentChange={handleContentChange}
        onTitleChange={handleTitleChange}
      />
    );
  }

  return null;
}

function buildStoryInstruction(config: StorytellersConfig): string {
  const typeMap: Record<string, string> = {
    blog: 'a blog post about',
    email: 'a professional email about',
    linkedin: 'a LinkedIn post about',
    docs: 'technical documentation for',
    essay: 'a thoughtful essay about',
    report: 'a report on',
  };
  const base = typeMap[config.writingType] ?? 'a piece about';
  const parts: string[] = [`${base} ${config.topic.trim()}`];
  if (config.goal) parts.push(`Primary goal: ${config.goal}.`);
  if (config.targetAudience) parts.push(`Target audience: ${config.targetAudience}.`);
  if (config.keyPoints) parts.push(`Key points to cover: ${config.keyPoints}.`);
  if (config.tone) parts.push(`Tone: ${config.tone.toLowerCase()}.`);
  if (config.length) parts.push(`Length: ${config.length}.`);
  if (config.language && config.language !== 'English') parts.push(`Write in ${config.language}.`);
  if (config.workingTitle) parts.push(`Use "${config.workingTitle}" as the working title.`);
  return parts.join(' ');
}
