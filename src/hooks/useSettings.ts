import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppSettings, CredentialInfo, Profile } from '@/lib/types';

export function useSettings(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data);
  }, []);

  const loadAppSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    setAppSettings(data);
  }, []);

  const loadCredentials = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_user_credentials');
    if (!error && Array.isArray(data)) {
      setCredentials(data as CredentialInfo[]);
    }
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([loadProfile(userId), loadAppSettings(), loadCredentials()])
      .finally(() => setLoading(false));
  }, [userId, loadProfile, loadAppSettings, loadCredentials]);

  const addCredential = useCallback(async (
    provider: string,
    apiKey: string,
    name?: string,
    baseUrl?: string,
    defaultModel?: string
  ) => {
    const { error } = await supabase.from('ai_credentials').insert({
      owner_type: 'user',
      owner_id: userId,
      provider,
      api_key: apiKey,
      name: name || '',
      base_url: baseUrl || null,
      default_model: defaultModel || null,
      is_enabled: true,
    });
    if (error) throw error;
    await loadCredentials();
  }, [userId, loadCredentials]);

  const updateCredential = useCallback(async (
    id: string,
    updates: { api_key?: string; is_enabled?: boolean; default_model?: string; name?: string; base_url?: string }
  ) => {
    const { error } = await supabase.from('ai_credentials').update(updates).eq('id', id);
    if (error) throw error;
    await loadCredentials();
  }, [loadCredentials]);

  const removeCredential = useCallback(async (id: string) => {
    const { error } = await supabase.from('ai_credentials').delete().eq('id', id);
    if (error) throw error;
    await loadCredentials();
  }, [loadCredentials]);

  const updateProfile = useCallback(async (updates: { display_name?: string }) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    await loadProfile(userId);
  }, [userId, loadProfile]);

  return {
    profile,
    appSettings,
    credentials,
    loading,
    addCredential,
    updateCredential,
    removeCredential,
    updateProfile,
    reload: () => { loadAppSettings(); loadCredentials(); if (userId) loadProfile(userId); },
  };
}
