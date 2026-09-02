import { useState } from 'react';
import { FileText, Plus, Trash2, Search, X } from 'lucide-react';
import type { Document } from '@/lib/types';

interface Props {
  documents: Document[];
  activeId: string | null;
  onSelect: (doc: Document) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DocumentSidebar({ documents, activeId, onSelect, onNew, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = query.trim()
    ? documents.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    : documents;

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Documents</h2>
          <button
            onClick={onNew}
            title="New document"
            className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 && (
          <div className="text-center py-8 px-4">
            <FileText size={20} className="text-stone-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {query ? 'No matching documents' : 'No documents yet'}
            </p>
          </div>
        )}

        {filtered.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition mb-1 ${
              doc.id === activeId
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <FileText size={13} className={`flex-shrink-0 mt-0.5 ${doc.id === activeId ? 'text-stone-300 dark:text-stone-500' : 'text-stone-400'}`} />
              <span className="text-xs font-medium leading-snug line-clamp-2 flex-1 min-w-0">
                {doc.title || 'Untitled'}
              </span>
            </div>
            <div className={`text-[10px] pl-5 flex items-center justify-between ${doc.id === activeId ? 'text-stone-400 dark:text-stone-500' : 'text-stone-400'}`}>
              <span>{formatDate(doc.updated_at)}</span>
              <span>{doc.word_count > 0 ? `${doc.word_count}w` : ''}</span>
            </div>

            {/* Delete button */}
            {doc.id !== activeId && (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(doc.id); }}
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition p-1 rounded text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-stone-900 rounded-xl p-5 shadow-xl border border-stone-200 dark:border-stone-800 max-w-xs w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">Archive document?</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">This document will be moved to the archive.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
