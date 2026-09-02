import type { AIRequest, AIResponse } from './types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function callAI(
  request: AIRequest,
  token?: string
): Promise<AIResponse> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ANON_KEY}`,
    },
    body: JSON.stringify({ ...request, stream: false }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `AI request failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.content) throw new Error('Invalid response from AI gateway');
  return data as AIResponse;
}

export async function streamAI(
  request: AIRequest,
  token: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `AI request failed (${response.status})`);
  }

  if (!response.body) throw new Error('No response body for streaming');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      let data = trimmed;
      if (data.startsWith('data: ')) data = data.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
      } catch {
        // skip non-JSON
      }
    }
  }
}

export function extractPlainText(content: Record<string, unknown>): string {
  const lines: string[] = [];
  function walk(node: Record<string, unknown>) {
    if (node.type === 'text' && typeof node.text === 'string') {
      lines.push(node.text);
    }
    if (Array.isArray(node.content)) {
      (node.content as Record<string, unknown>[]).forEach(walk);
    }
  }
  walk(content);
  return lines.join(' ');
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function inlineMarkdownToContent(value: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const pattern = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) nodes.push({ type: 'text', text: value.slice(lastIndex, match.index) });
    if (match[2]) nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] });
    else if (match[4]) nodes.push({ type: 'text', text: match[4], marks: [{ type: 'italic' }] });
    else if (match[5]) nodes.push({ type: 'text', text: match[5], marks: [{ type: 'strike' }] });
    else if (match[6]) nodes.push({ type: 'text', text: match[6], marks: [{ type: 'code' }] });
    else if (match[7] && match[8]) nodes.push({ type: 'text', text: match[7], marks: [{ type: 'link', attrs: { href: match[8] } }] });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) nodes.push({ type: 'text', text: value.slice(lastIndex) });
  return nodes.length ? nodes : [{ type: 'text', text: '' }];
}

export function plainTextToContent(text: string): Record<string, unknown> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const content: Record<string, unknown>[] = [];
  let paragraph: string[] = [];
  let list: Record<string, unknown>[] = [];
  let listType: 'bulletList' | 'orderedList' | null = null;
  let codeLines: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join(' ').trim();
    if (value) content.push({ type: 'paragraph', content: inlineMarkdownToContent(value) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length || !listType) return;
    content.push({ type: listType, content: list });
    list = [];
    listType = null;
  };
  const flushCode = () => {
    if (!codeLines.length) return;
    content.push({ type: 'preformatted', content: [{ type: 'text', text: codeLines.join('\n') }] });
    codeLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    const horizontalRule = /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line);

    if (heading) {
      flushParagraph();
      flushList();
      content.push({ type: 'heading', attrs: { level: heading[1].length }, content: inlineMarkdownToContent(heading[2]) });
    } else if (bullet || ordered) {
      flushParagraph();
      const nextType = bullet ? 'bulletList' : 'orderedList';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push({ type: 'listItem', content: [{ type: 'paragraph', content: inlineMarkdownToContent((bullet ?? ordered)?.[1] ?? '') }] });
    } else if (quote) {
      flushParagraph();
      flushList();
      content.push({ type: 'blockquote', content: [{ type: 'paragraph', content: inlineMarkdownToContent(quote[1]) }] });
    } else if (horizontalRule) {
      flushParagraph();
      flushList();
      content.push({ type: 'horizontalRule' });
    } else if (line.trim()) {
      flushList();
      paragraph.push(line.trim());
    } else {
      flushParagraph();
      flushList();
    }
  }

  if (inCode) flushCode();
  flushParagraph();
  flushList();
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}
