import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

/**
 * Client Supabase pour le serveur uniquement.
 * Utilise process.env pour éviter l'inlining de la clé dans les bundles SSR.
 * Ne pas importer dans du code client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseServer(): SupabaseClient<any> | null {
  if (_client) return _client
  const url = process.env.PUBLIC_SUPABASE_URL
  const key = process.env.PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key)
  return _client
}
