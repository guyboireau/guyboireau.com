import { describe, it, expect, vi } from 'vitest'

describe('getSupabase', () => {
  it('crée un client Supabase quand les variables sont présentes', async () => {
    vi.resetModules()
    const { getSupabase } = await import('./supabase')
    const client = getSupabase()
    expect(client).not.toBeNull()
  })

  it('retourne le même client (singleton) à plusieurs appels', async () => {
    vi.resetModules()
    const { getSupabase } = await import('./supabase')
    const client1 = getSupabase()
    const client2 = getSupabase()
    expect(client1).toBe(client2)
  })
})