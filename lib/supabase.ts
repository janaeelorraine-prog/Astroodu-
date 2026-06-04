import { createBrowserClient } from '@supabase/ssr'

// Single browser Supabase client for the Temple.
// Reads are public (RLS allows anon SELECT); writes require an authed session.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
