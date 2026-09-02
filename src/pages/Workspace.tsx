import { useState, useRef, useCallback, useEffect } from 'react';
import {
  PenLine, ChevronLeft, PanelLeft, Download,
  Check, Loader2, FileText, Sun, Moon, Settings as SettingsIcon,
  MessageSquare, X, MoreVertical, Printer, Share2,
} from 'lucide-react';
import type { Document, Workspace } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '@/hooks/useTheme';
import Editor, { type EditorHandle } from '@/components/Editor';
import EditorToolbar from '@/components/EditorToolbar';
import AIChat from '@/components/AIChat';
import DocumentSidebar from '@/components/DocumentSidebar';
import { countWords } from '@/lib/ai';

interface Props {
  workspace: Workspace;
  documents: Document[];
  activeDocument: Document | null;
  session: Session | null;
  saving: boolean;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenExtensions: () => void;
  onSelectDocument: (doc: Document) => void;
  onNewDocument: () => void;
  onDeleteDocument: (id: string) => void;
  onContentChange: (id: string, content: Record<string, unknown>, plainText: string, wordCount: number) => void;
  onTitleChange: (id: string, title: string) => void;
}

export default function Workspace({
  workspace, documents, activeDocument, session, saving,
  onGoHome, onOpenSettings, onOpenExtensions, onSelectDocument, onNewDocument, onDeleteDocument,
  onContentChange, onTitleChange,
}: Props) {
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  useEffect(() => {
    if (activeDocument) setTitleValue(activeDocument.title);
  }, [activeDocument?.id]);

  // Close panels on small screens by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { setSidebarOpen(false); setAiPanelOpen(false); }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDocumentContext = useCallback(() => {
    const fullText = activeDocument?.plain_text ?? '';
    const selection = editorRef.current?.getSelection() ?? '';
    return { fullText, selection };
  }, [activeDocument]);

  const handleInsertContent = useCallback((text: string) => {
    editorRef.current?.appendContent(text);
  }, []);

  function handleTitleBlur() {
    setTitleEditing(false);
    if (activeDocument && titleValue.trim() && titleValue !== activeDocument.title) {
      onTitleChange(activeDocument.id, titleValue.trim());
    }
  }

  function handleExportMarkdown() {
    if (!activeDocument) return;
    const text = activeDocument.plain_text ?? '';
    const blob = new Blob([`# ${activeDocument.title}\n\n${text}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeDocument.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handlePrintPDF() {
    window.print();
  }

  return (
    <div className="flex h-screen bg-white dark:bg-stone-950 overflow-hidden">
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-all duration-200 overflow-hidden no-print ${sidebarOpen ? 'w-60' : 'w-0'}`}>
        <div className="w-60 h-full">
          <div className="h-14 flex items-center px-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex-shrink-0">
            <button onClick={onGoHome} className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition">
              <PenLine size={15} />
              <span className="font-semibold text-stone-900 dark:text-stone-100">Writelab</span>
            </button>
          </div>
          <div className="h-[calc(100vh-3.5rem)]">
            <DocumentSidebar
              documents={documents}
              activeId={activeDocument?.id ?? null}
              onSelect={onSelectDocument}
              onNew={onNewDocument}
              onDelete={onDeleteDocument}
            />
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-stone-100 dark:border-stone-800">
        {/* Header */}
        <div className="h-14 flex items-center px-4 gap-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0 bg-white dark:bg-stone-900 no-print">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex-shrink-0"
          >
            <PanelLeft size={16} />
          </button>

          {/* Title */}
          {activeDocument && (
            <div className="flex-1 min-w-0">
              {titleEditing ? (
                <input
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleBlur(); }}
                  className="w-full text-sm font-semibold text-stone-900 dark:text-stone-100 bg-transparent outline-none border-b border-stone-300 dark:border-stone-600 pb-0.5"
                />
              ) : (
                <button
                  onClick={() => setTitleEditing(true)}
                  className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-stone-600 dark:hover:text-stone-300 truncate max-w-full block transition"
                >
                  {activeDocument.title || 'Untitled'}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {saving ? (
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Loader2 size={12} className="animate-spin" />
                Saving
              </div>
            ) : activeDocument ? (
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <Check size={11} />
                Saved
              </div>
            ) : null}
            {/* Mobile AI toggle */}
            <button
              onClick={() => setMobileAiOpen(true)}
              className="md:hidden p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <MessageSquare size={15} />
            </button>
            {/* Three-dot overflow menu */}
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                title="More options"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <MoreVertical size={15} />
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg py-1">
                    <button
                      onClick={() => { handlePrintPDF(); setMoreMenuOpen(false); }}
                      disabled={!activeDocument}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Printer size={14} />
                      Print / PDF
                    </button>
                    <button
                      onClick={() => { handleExportMarkdown(); setMoreMenuOpen(false); }}
                      disabled={!activeDocument}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download size={14} />
                      Export Markdown
                    </button>
                    <button
                      onClick={() => { onOpenSettings(); setMoreMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition"
                    >
                      <SettingsIcon size={14} />
                      Settings
                    </button>
                    <div className="h-px bg-stone-200 dark:bg-stone-700 my-1" />
                    <button
                      onClick={() => { toggle(); setMoreMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition"
                    >
                      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="no-print">
          <EditorToolbar
                disabled={!activeDocument}
                workspaceId={workspace.id}
                session={session}
                getSelection={() => editorRef.current?.getSelection() ?? ''}
                getDocumentContent={() => activeDocument?.plain_text ?? ''}
                onInsertContent={handleInsertContent}
                onOpenExtensions={onOpenExtensions}
              />
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-hidden">
          {!activeDocument ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <FileText size={36} className="text-stone-200 dark:text-stone-700 mb-4" />
              <p className="text-stone-400 dark:text-stone-500 text-sm font-medium mb-1">No document open</p>
              <p className="text-stone-300 dark:text-stone-600 text-xs mb-4">Select a document from the sidebar or create a new one.</p>
              <button
                onClick={onGoHome}
                className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-4 py-2 rounded-lg transition"
              >
                <ChevronLeft size={14} />
                Go back home
              </button>
            </div>
          ) : (
            <div className="h-full overflow-y-auto bg-white dark:bg-stone-950">
              <div className="max-w-2xl mx-auto px-6 sm:px-8 py-10 min-h-full print-area">
                <Editor
                  ref={editorRef}
                  content={activeDocument.content as Record<string, unknown>}
                  onChange={(content, plain, words) => {
                    onContentChange(activeDocument.id, content, plain, words);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-8 flex items-center justify-between px-6 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex-shrink-0 no-print">
          <div className="flex items-center gap-4 text-[11px] text-stone-400">
            {activeDocument && (
              <>
                <span>{countWords(activeDocument.plain_text ?? '')} words</span>
                <span className="capitalize">{activeDocument.status}</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-stone-400">
            {workspace.name}
          </div>
        </div>
      </div>

      {/* AI Chat panel — desktop */}
      <div className={`w-80 flex-shrink-0 flex-col border-l border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 no-print hidden md:flex ${aiPanelOpen ? '' : 'hidden'}`}>
        <AIChat
          session={session}
          getDocumentContext={getDocumentContext}
          onInsertContent={activeDocument ? handleInsertContent : undefined}
          workspaceId={workspace.id}
        />
      </div>

      {/* AI Chat panel — mobile drawer */}
      {mobileAiOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileAiOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-stone-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">AI Assistant</span>
              <button onClick={() => setMobileAiOpen(false)} className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIChat
                session={session}
                getDocumentContext={getDocumentContext}
                onInsertContent={activeDocument ? handleInsertContent : undefined}
                workspaceId={workspace.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
