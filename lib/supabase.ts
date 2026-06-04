import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Public, RLS-protected values. The publishable key is safe to expose in the
// browser bundle by design; Vercel env vars override these when set.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kzmfcjhmpdffxhfjnkbu.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_KBhs1I-db-jJt61Zj7Lalg_tIpfp_j6'

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_client) _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}

// Lazy proxy so the client is constructed only on first real use in the browser,
// never at module load during build-time prerender (which was failing the build).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
