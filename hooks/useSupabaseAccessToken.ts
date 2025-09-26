import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabaseAccessToken() {
  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  return { getAccessToken };
}
