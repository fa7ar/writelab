import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';
import type { ChatMessage, AIAction } from '@/lib/types';
import { callAI, streamAI } from '@/lib/ai';

interface Props {
  session: { access_token: string } | null;
  getDocumentContext: () => { fullText: string; selection: string };
  onInsertContent?: (text: string) => void;
  workspaceId?: string;
}

const QUICK_ACTIONS: { label: string; action: AIAction; hint: string }[] = [
  { label: 'Improve', action: 'improve', hint: 'Make the writing clearer and more engaging' },
  { label: 'Expand', action: 'expand', hint: 'Add more detail and depth' },
  { label: 'Shorten', action: 'shorten', hint: 'Make it more concise' },
  { label: 'Outline', action: 'outline', hint: 'Create a structured outline' },
  { label: 'Brainstorm', action: 'brainstorm', hint: 'Generate ideas on this topic' },
  { label: 'Rewrite', action: 'rewrite', hint: 'Rewrite in a different way' },
];

export default function AIChat({ session, getDocumentContext, onInsertContent, workspaceId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send(instruction: string, action: AIAction = 'write') {
    if (!instruction.trim() || loading) return;
    const { fullText, selection } = getDocumentContext();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: instruction.trim(),
      action,
      timestamp: new Date(),
    };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);
    setInput('');
    setLoading(true);
    setStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const token = session?.access_token;

      if (!token) throw new Error('Authentication required');

      await streamAI(
        {
          action,
          instruction: instruction.trim(),
          documentContent: fullText || undefined,
          selection: selection || undefined,
          conversationHistory: history,
          stream: true,
          workspaceId,
        },
        token,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          );
        },
        abortRef.current?.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}` } : m)
      );
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-stone-900 dark:bg-stone-100 rounded-md flex items-center justify-center">
            <Sparkles size={12} className="text-white dark:text-stone-900" />
          </div>
          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Clear chat"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles size={18} className="text-stone-500 dark:text-stone-400" />
            </div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Ask anything about your document</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed">
              The AI can see your document and selection. Ask it to improve, expand, summarize, or brainstorm.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-br-sm'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-100 dark:border-stone-700 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap">
                    {msg.content || (streaming && loading ? '...' : '')}
                    {streaming && msg.content && <span className="inline-block w-1.5 h-3.5 bg-stone-400 dark:bg-stone-500 ml-0.5 animate-pulse" />}
                  </p>
                  {onInsertContent && msg.content && !msg.content.startsWith('Error:') && (
                    <button
                      onClick={() => onInsertContent(msg.content)}
                      className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2 transition"
                    >
                      Insert into document
                    </button>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && !messages[messages.length - 1]?.content && (
          <div className="flex justify-start">
            <div className="bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-stone-400" />
              <span className="text-sm text-stone-400 dark:text-stone-500">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2 flex-shrink-0">
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition mb-2"
        >
          <ChevronDown size={12} className={`transition-transform ${showActions ? 'rotate-180' : ''}`} />
          Quick actions
        </button>
        {showActions && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.action}
                disabled={loading}
                onClick={() => send(qa.hint, qa.action)}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs rounded-full transition disabled:opacity-50"
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex items-end gap-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400 transition">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Ask AI anything..."
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 outline-none leading-relaxed"
          />
          <button
            disabled={!input.trim() || loading}
            onClick={() => send(input)}
            className="flex-shrink-0 w-7 h-7 bg-stone-900 dark:bg-stone-100 hover:bg-stone-700 dark:hover:bg-stone-300 disabled:bg-stone-200 dark:disabled:bg-stone-700 rounded-lg flex items-center justify-center transition mb-0.5"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin text-stone-400 dark:text-stone-500" />
            ) : (
              <Send size={12} className="text-white dark:text-stone-900" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 text-center">
          Shift + Enter for new line &nbsp;·&nbsp; Enter to send
        </p>
      </div>
    </div>
  );
}
