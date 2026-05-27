import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

/**
 * Client Supabase pour le serveur uniquement.
 * Utilise process.env pour éviter l'inlining de la clé dans les bundles SSR.
 * Ne pas importer dans du code client.
 */
export function getSupabaseServer() {
  if (_client) return _client
  const url = process.env.PUBLIC_SUPABASE_URL
  const key = process.env.PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}
