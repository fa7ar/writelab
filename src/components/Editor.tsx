import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { plainTextToContent } from '@/lib/ai';

interface Props {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>, plainText: string, wordCount: number) => void;
  readOnly?: boolean;
}

export interface EditorHandle {
  getSelection(): string;
  replaceSelection(text: string): void;
  appendContent(text: string): void;
  focus(): void;
}

function contentToHtml(node: Record<string, unknown>): string {
  const type = node.type as string;
  const content = (node.content as Record<string, unknown>[] | undefined) ?? [];
  const text = node.text as string | undefined;
  const marks = (node.marks as { type: string }[] | undefined) ?? [];

  if (type === 'doc') return content.map(contentToHtml).join('');
  if (type === 'text') {
    let t = (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    for (const m of marks) {
      if (m.type === 'bold') t = `<strong>${t}</strong>`;
      if (m.type === 'italic') t = `<em>${t}</em>`;
      if (m.type === 'underline') t = `<u>${t}</u>`;
      if (m.type === 'strike') t = `<s>${t}</s>`;
      if (m.type === 'code') t = `<code>${t}</code>`;
      if (m.type === 'link') {
        const href = (m as Record<string, unknown> & { attrs?: { href?: string } }).attrs?.href ?? '#';
        return `<a href="${href}">${t}</a>`;
      }
    }
    return t;
  }
  if (type === 'paragraph') {
    const inner = content.map(contentToHtml).join('');
    return `<p>${inner || '<br>'}</p>`;
  }
  if (type === 'heading') {
    const level = (node.attrs as { level?: number } | undefined)?.level ?? 1;
    const inner = content.map(contentToHtml).join('');
    return `<h${level}>${inner}</h${level}>`;
  }
  if (type === 'bulletList') return `<ul>${content.map(contentToHtml).join('')}</ul>`;
  if (type === 'orderedList') return `<ol>${content.map(contentToHtml).join('')}</ol>`;
  if (type === 'listItem') return `<li>${content.map(contentToHtml).join('')}</li>`;
  if (type === 'blockquote') return `<blockquote>${content.map(contentToHtml).join('')}</blockquote>`;
  if (type === 'hardBreak') return '<br>';
  if (type === 'horizontalRule') return '<hr>';
  if (type === 'image') {
    const src = (node.attrs as { src?: string } | undefined)?.src ?? '';
    const alt = (node.attrs as { alt?: string } | undefined)?.alt ?? '';
    return `<img src="${src}" alt="${alt}" />`;
  }
  if (type === 'preformatted') {
    const inner = content.map(contentToHtml).join('');
    return `<pre><code>${inner}</code></pre>`;
  }
  return content.map(contentToHtml).join('');
}

function htmlToContent(el: HTMLElement): Record<string, unknown> {
  function parseNode(node: Node): Record<string, unknown>[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? '';
      if (!t) return [];
      return [{ type: 'text', text: t }];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).flatMap(parseNode);

    if (tag === 'p') return [{ type: 'paragraph', content: children.length ? children : [{ type: 'text', text: '' }] }];
    if (tag === 'h1') return [{ type: 'heading', attrs: { level: 1 }, content: children }];
    if (tag === 'h2') return [{ type: 'heading', attrs: { level: 2 }, content: children }];
    if (tag === 'h3') return [{ type: 'heading', attrs: { level: 3 }, content: children }];
    if (tag === 'ul') return [{ type: 'bulletList', content: children }];
    if (tag === 'ol') return [{ type: 'orderedList', content: children }];
    if (tag === 'li') return [{ type: 'listItem', content: [{ type: 'paragraph', content: children }] }];
    if (tag === 'blockquote') return [{ type: 'blockquote', content: children }];
    if (tag === 'strong' || tag === 'b') return children.map((c) => ({ ...c, marks: [...((c.marks as { type: string }[]) ?? []), { type: 'bold' }] }));
    if (tag === 'em' || tag === 'i') return children.map((c) => ({ ...c, marks: [...((c.marks as { type: string }[]) ?? []), { type: 'italic' }] }));
    if (tag === 'u') return children.map((c) => ({ ...c, marks: [...((c.marks as { type: string }[]) ?? []), { type: 'underline' }] }));
    if (tag === 's' || tag === 'del' || tag === 'strike') return children.map((c) => ({ ...c, marks: [...((c.marks as { type: string }[]) ?? []), { type: 'strike' }] }));
    if (tag === 'code') {
      const text = el.textContent ?? '';
      return [{ type: 'text', text, marks: [{ type: 'code' }] }];
    }
    if (tag === 'pre') {
      const codeEl = el.querySelector('code');
      const text = codeEl?.textContent ?? el.textContent ?? '';
      return [{ type: 'preformatted', content: [{ type: 'text', text }] }];
    }
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '#';
      const childrenWithMarks = children.map((c) => ({ ...c, marks: [...((c.marks as { type: string }[]) ?? []), { type: 'link', attrs: { href } }] }));
      return childrenWithMarks;
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return [{ type: 'image', attrs: { src, alt } }];
    }
    if (tag === 'hr') return [{ type: 'horizontalRule' }];
    if (tag === 'br') return [{ type: 'hardBreak' }];
    if (tag === 'div') {
      if (children.length === 0) return [{ type: 'paragraph', content: [] }];
      return children.flatMap((c) => {
        if ((c as Record<string, unknown>).type === 'paragraph') return [c];
        return [{ type: 'paragraph', content: [c] }];
      });
    }
    return children;
  }

  const rawContent = Array.from(el.childNodes).flatMap(parseNode);
  const docContent = rawContent.length ? rawContent : [{ type: 'paragraph', content: [] }];
  return { type: 'doc', content: docContent };
}

const Editor = forwardRef<EditorHandle, Props>(({ content, onChange, readOnly = false }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const suppressNext = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    suppressNext.current = true;
    editorRef.current.innerHTML = contentToHtml(content);
  }, [content]);

  const handleInput = useCallback(() => {
    if (suppressNext.current) { suppressNext.current = false; return; }
    if (!editorRef.current) return;
    const parsed = htmlToContent(editorRef.current);
    const plain = editorRef.current.innerText ?? '';
    const words = plain.trim() ? plain.trim().split(/\s+/).length : 0;
    onChange(parsed, plain, words);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getSelection() {
      const sel = window.getSelection();
      return sel?.toString() ?? '';
    },
    replaceSelection(text: string) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      sel.collapseToEnd();
      if (editorRef.current) {
        const parsed = htmlToContent(editorRef.current);
        const plain = editorRef.current.innerText ?? '';
        onChange(parsed, plain, plain.trim() ? plain.trim().split(/\s+/).length : 0);
      }
    },
    appendContent(text: string) {
      if (!editorRef.current) return;
      const parsedNew = plainTextToContent(text);
      const htmlNew = contentToHtml(parsedNew);
      const spacer = document.createElement('p');
      spacer.innerHTML = '&nbsp;';
      editorRef.current.appendChild(spacer);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = htmlNew;
      while (wrapper.firstChild) {
        editorRef.current.appendChild(wrapper.firstChild);
      }
      const plain = editorRef.current.innerText ?? '';
      const parsed = htmlToContent(editorRef.current);
      onChange(parsed, plain, plain.trim() ? plain.trim().split(/\s+/).length : 0);
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
    },
    focus() {
      editorRef.current?.focus();
    },
  }));

  return (
    <div
      ref={editorRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      spellCheck
      className="
        outline-none min-h-full w-full
        text-stone-800 dark:text-stone-200 text-[16.5px] leading-relaxed
        [&_p]:mb-4 [&_p:last-child]:mb-0
        [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-stone-900 dark:[&_h1]:text-stone-100 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1:first-child]:mt-0
        [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_h2]:mb-3 [&_h2]:mt-5
        [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-stone-900 dark:[&_h3]:text-stone-100 [&_h3]:mb-2 [&_h3]:mt-4
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:mb-1
        [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol_li]:mb-1
        [&_blockquote]:border-l-4 [&_blockquote]:border-stone-300 dark:[&_blockquote]:border-stone-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-stone-600 dark:[&_blockquote]:text-stone-400 [&_blockquote]:my-4
        [&_strong]:font-semibold [&_em]:italic
        [&_s]:line-through [&_del]:line-through [&_strike]:line-through
        [&_code]:bg-stone-100 dark:[&_code]:bg-stone-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_code]:font-mono [&_code]:text-stone-700 dark:[&_code]:text-stone-300 [&_code]:before:content-none [&_code]:after:content-none
        [&_pre]:bg-stone-100 dark:[&_pre]:bg-stone-800 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono [&_pre_code]:text-sm [&_pre_code]:text-stone-700 dark:[&_pre_code]:text-stone-300
        [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a:hover]:text-blue-700 dark:[&_a:hover]:text-blue-300
        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_img]:mx-auto
        [&_hr]:border-none [&_hr]:h-px [&_hr]:bg-stone-200 dark:[&_hr]:bg-stone-700 [&_hr]:my-6
      "
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    />
  );
});

Editor.displayName = 'Editor';
export default Editor;
