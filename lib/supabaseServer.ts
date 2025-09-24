import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client that prefers the service role when available.
// Falls back to anon for read-only contexts, and supports user bearer for RLS.
export function createServerSupabase(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Primary expected env for service key
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Optional fallback if the project provided a NEXT_PUBLIC_* variant
  if (!serviceKey && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY) {
    serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  }
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  const key = serviceKey || anon
  if (!key) throw new Error('Missing SUPABASE keys')
  const options: any = { auth: { persistSession: false } }
  if (!serviceKey && token) {
    // Supply user JWT via global header for RLS (supabase-js v2)
    options.global = { headers: { Authorization: `Bearer ${token}` } }
  }
  return createClient(url, key, options)
}
