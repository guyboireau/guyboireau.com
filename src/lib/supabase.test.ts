import { describe, it, expect } from 'vitest'
import { getSupabase } from './supabase'

describe('getSupabase', () => {
  it('retourne null si les variables d’environnement sont manquantes', () => {
    const originalUrl = import.meta.env.PUBLIC_SUPABASE_URL
    const originalKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

    import.meta.env.PUBLIC_SUPABASE_URL = ''
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY = ''

    // On doit réinitialiser le module pour tester le cas où _client est null
    // En pratique, _client est un module-level state, donc on teste le cas
    // où les env vars sont absentes en modifiant import.meta.env
    const result = getSupabase()
    expect(result).toBeNull()

    import.meta.env.PUBLIC_SUPABASE_URL = originalUrl
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY = originalKey
  })

  it('crée un client Supabase quand les variables sont présentes', () => {
    const client = getSupabase()
    expect(client).not.toBeNull()
  })

  it('retourne le même client (singleton) à plusieurs appels', () => {
    const client1 = getSupabase()
    const client2 = getSupabase()
    expect(client1).toBe(client2)
  })
})
