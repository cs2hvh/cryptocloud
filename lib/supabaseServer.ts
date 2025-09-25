import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client that handles user authentication properly
export function createServerSupabase(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }

  // When we have a user token, use anon key with the user's JWT
  if (token) {
    options.global = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  }

  return createClient(url, anon, options)
}
