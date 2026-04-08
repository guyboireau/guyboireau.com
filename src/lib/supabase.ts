import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_client) {
    const url = import.meta.env.PUBLIC_SUPABASE_URL
    const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    _client = createClient(url, key)
  }
  return _client
}
