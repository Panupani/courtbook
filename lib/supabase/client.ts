import { createBrowserClient } from '@supabase/ssr'

function resolveUrl(val: string | undefined) {
  try {
    if (!val) throw new Error()
    new URL(val)
    return val
  } catch {
    return 'https://placeholder.supabase.co'
  }
}

const supabaseUrl = resolveUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
