import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Workspace, Document } from '@/lib/types';

export function useWorkspace(userId: string | undefined) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureWorkspace = useCallback(async (uid: string) => {
    const { data: existing } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setWorkspace(existing);
      return existing;
    }

    const { data: created, error } = await supabase
      .from('workspaces')
      .insert({ name: 'My Workspace' })
      .select()
      .single();

    if (error) throw error;
    setWorkspace(created);
    return created;
  }, []);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (!error && data) setDocuments(data);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    ensureWorkspace(userId)
      .then((ws) => loadDocuments(ws.id))
      .finally(() => setLoading(false));
  }, [userId, ensureWorkspace, loadDocuments]);

  const createDocument = useCallback(
    async (title: string, content: Record<string, unknown>, plainText: string) => {
      if (!workspace) return null;
      const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
      const { data, error } = await supabase
        .from('documents')
        .insert({ workspace_id: workspace.id, title, content, plain_text: plainText, word_count: wordCount })
        .select()
        .single();
      if (error) throw error;
      setDocuments((prev) => [data, ...prev]);
      return data;
    },
    [workspace]
  );

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Pick<Document, 'title' | 'content' | 'plain_text' | 'word_count'>>) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setDocuments((prev) => prev.map((d) => (d.id === id ? data : d)));
      return data;
    },
    []
  );

  const deleteDocument = useCallback(async (id: string) => {
    await supabase.from('documents').update({ status: 'archived' }).eq('id', id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const refreshDocuments = useCallback(() => {
    if (workspace) loadDocuments(workspace.id);
  }, [workspace, loadDocuments]);

  return {
    workspace,
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    refreshDocuments,
  };
}
