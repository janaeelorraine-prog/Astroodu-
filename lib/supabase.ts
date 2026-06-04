import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Public, RLS-protected values. Env vars take precedence, but we sanitize them
// (trim whitespace/quotes) and validate the URL, falling back to the known
// public values so a malformed env var can never break the live site.
function clean(v: string | undefined): string {
  return (v || '').trim().replace(/^['"]+|['"]+$/g, '')
}

const ENV_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_URL =
  ENV_URL.startsWith('https://') || ENV_URL.startsWith('http://')
    ? ENV_URL
    : 'https://kzmfcjhmpdffxhfjnkbu.supabase.co'

const ENV_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const SUPABASE_ANON_KEY =
  ENV_KEY || 'sb_publishable_KBhs1I-db-jJt61Zj7Lalg_tIpfp_j6'

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_client) _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}

// Lazy proxy: client built only on first real use in the browser, never during prerender.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
