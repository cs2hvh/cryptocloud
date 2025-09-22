import { createClient } from '@supabase/supabase-js'

export function createServerSupabase(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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
