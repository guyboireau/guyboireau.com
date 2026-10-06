import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Typé sur le schéma réel (src/lib/database.types.ts) : une table ou une colonne
// absente des migrations ne passe plus `tsc`.
let _client: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> | null {
  if (_client) return _client
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient<Database>(url, key)
  return _client
}
