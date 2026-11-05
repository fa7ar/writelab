import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        console.error('Unable to restore Supabase session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
