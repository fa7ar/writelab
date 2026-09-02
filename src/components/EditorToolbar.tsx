import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link, Image,
  List, ListOrdered, Quote, Minus,
  Undo, Redo, Heading, ChevronDown,
} from 'lucide-react';
import CopywritingMenu from './CopywritingMenu';
import type { Session } from '@supabase/supabase-js';

interface Props {
  disabled?: boolean;
  workspaceId?: string;
  session?: Session | null;
  getSelection?: () => string;
  getDocumentContent?: () => string;
  onInsertContent?: (text: string) => void;
  onOpenExtensions?: () => void;
}

interface ToolbarButton {
  icon: React.ReactNode;
  command: string;
  arg?: string;
  title: string;
  separator?: boolean;
  prompt?: boolean;
}

const BUTTONS: ToolbarButton[] = [
  { icon: <Undo size={15} />, command: 'undo', title: 'Undo' },
  { icon: <Redo size={15} />, command: 'redo', title: 'Redo', separator: true },
  { icon: <Bold size={15} />, command: 'bold', title: 'Bold' },
  { icon: <Italic size={15} />, command: 'italic', title: 'Italic' },
  { icon: <Underline size={15} />, command: 'underline', title: 'Underline' },
  { icon: <Strikethrough size={15} />, command: 'strikeThrough', title: 'Strikethrough' },
  { icon: <Code size={15} />, command: 'formatBlock', arg: 'pre', title: 'Inline code', separator: true },
  { icon: <Link size={15} />, command: 'createLink', title: 'Insert link', prompt: true },
  { icon: <Image size={15} />, command: 'insertImage', title: 'Insert image URL', prompt: true },
  { icon: <Minus size={15} />, command: 'insertHorizontalRule', title: 'Divider', separator: true },
  { icon: <List size={15} />, command: 'insertUnorderedList', title: 'Bullet list' },
  { icon: <ListOrdered size={15} />, command: 'insertOrderedList', title: 'Numbered list' },
  { icon: <Quote size={15} />, command: 'formatBlock', arg: 'blockquote', title: 'Quote' },
];

const HEADING_OPTIONS = [
  { label: 'Heading 1', arg: 'h1', tag: 'H1' },
  { label: 'Heading 2', arg: 'h2', tag: 'H2' },
  { label: 'Heading 3', arg: 'h3', tag: 'H3' },
];

export default function EditorToolbar({ disabled, workspaceId, session, getSelection, getDocumentContent, onInsertContent, onOpenExtensions }: Props) {
  const [promptState, setPromptState] = useState<{ command: string; label: string } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [headingOpen, setHeadingOpen] = useState(false);
  const savedRange = useRef<Range | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headingOpen) return;
    const onClick = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setHeadingOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [headingOpen]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  }

  function handlePrompt(command: string, label: string) {
    saveSelection();
    setPromptState({ command, label });
    setPromptValue('');
  }

  function submitPrompt() {
    if (!promptState) return;
    const val = promptValue.trim();
    if (val) {
      restoreSelection();
      exec(promptState.command, val);
    }
    setPromptState(null);
    setPromptValue('');
  }

  function handleHeading(arg: string) {
    setHeadingOpen(false);
    exec('formatBlock', arg);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-0.5 px-4 py-2 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex-wrap">
        {BUTTONS.slice(0, 2).map((btn, i) => (
          <span key={i} className="flex items-center">
            {btn.separator && <span className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1.5" />}
            <button
              title={btn.title}
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault();
                if (btn.prompt) {
                  handlePrompt(btn.command, btn.title);
                } else {
                  exec(btn.command, btn.arg);
                }
              }}
              className="p-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {btn.icon}
            </button>
          </span>
        ))}

        {/* Heading popover */}
        <span className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1.5" />
        <div ref={headingRef} className="relative">
          <button
            title="Headings"
            disabled={disabled}
            onClick={() => setHeadingOpen(!headingOpen)}
            className="flex items-center gap-0.5 p-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Heading size={15} />
            <ChevronDown size={11} className={`transition ${headingOpen ? 'rotate-180' : ''}`} />
          </button>
          {headingOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
              {HEADING_OPTIONS.map((opt) => (
                <button
                  key={opt.arg}
                  disabled={disabled}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHeading(opt.arg);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-left"
                >
                  <span className="text-xs font-mono text-stone-400 dark:text-stone-500 w-5">{opt.tag}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {BUTTONS.slice(2).map((btn, i) => (
          <span key={i + 2} className="flex items-center">
            {btn.separator && <span className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1.5" />}
            <button
              title={btn.title}
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault();
                if (btn.prompt) {
                  handlePrompt(btn.command, btn.title);
                } else {
                  exec(btn.command, btn.arg);
                }
              }}
              className="p-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {btn.icon}
            </button>
          </span>
        ))}
        {workspaceId && onInsertContent && onOpenExtensions && (
          <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-0.5" />
        )}
        {workspaceId && onInsertContent && onOpenExtensions && (
          <CopywritingMenu
            workspaceId={workspaceId}
            session={session ?? null}
            disabled={disabled}
            getSelection={getSelection ?? (() => '')}
            getDocumentContent={getDocumentContent ?? (() => '')}
            onInsertContent={onInsertContent}
            onOpenExtensions={onOpenExtensions}
          />
        )}
      </div>

      {promptState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setPromptState(null)}>
          <div
            className="bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 p-4 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {promptState.label}
            </label>
            <input
              autoFocus
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitPrompt(); }
                if (e.key === 'Escape') setPromptState(null);
              }}
              placeholder={promptState.command === 'createLink' ? 'https://example.com' : 'https://example.com/image.png'}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400"
            />
            <div className="flex gap-2 mt-3">
              <button
                onMouseDown={(e) => { e.preventDefault(); submitPrompt(); }}
                className="flex-1 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 rounded-lg transition"
              >
                Insert
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setPromptState(null); }}
                className="flex-1 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
