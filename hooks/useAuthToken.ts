import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuthToken() {
  useEffect(() => {
    // Set initial token in cookie if available
    const setTokenCookie = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; secure; samesite=lax`;
      }
    };

    setTokenCookie();

    // Listen for auth changes and update cookie
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; secure; samesite=lax`;
      } else {
        // Clear cookie on sign out
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}