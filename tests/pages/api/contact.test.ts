import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/pages/api/contact'

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
      },
    }
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}))

function createContactRequest(body: object, clientAddress = '127.0.0.1') {
  return {
    request: new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    clientAddress,
  } as unknown as Parameters<typeof POST>[0]
}

describe('/api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 400 si les données sont invalides', async () => {
    const context = createContactRequest({ name: 'A', email: 'invalid', message: 'short' })
    const response = await POST(context)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Données invalides')
    expect(body.details).toBeDefined()
  })

  it('retourne 429 en cas de rate limiting', async () => {
    const ip = '1.2.3.4'
    // 6 requêtes pour dépasser la limite de 5
    for (let i = 0; i < 5; i++) {
      const ctx = createContactRequest(
        { name: `User ${i}`, email: 'test@example.com', message: 'Message de test suffisamment long.' },
        ip
      )
      await POST(ctx)
    }

    const ctx = createContactRequest(
      { name: 'Blocked', email: 'test@example.com', message: 'Message de test suffisamment long.' },
      ip
    )
    const response = await POST(ctx)

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('Trop de requêtes')
  })

  it('retourne 500 si la clé Resend est manquante', async () => {
    const originalKey = import.meta.env.RESEND_API_KEY
    import.meta.env.RESEND_API_KEY = ''

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '5.5.5.5')

    const response = await POST(ctx)
    expect(response.status).toBe(500)

    import.meta.env.RESEND_API_KEY = originalKey
  })

  it('envoie l’email et retourne 200 en cas de succès', async () => {
    const { Resend } = await import('resend')
    const { createClient } = await import('@supabase/supabase-js')

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      project_type: 'site-vitrine',
      message: 'Bonjour, je souhaite un devis pour un site vitrine professionnel.',
    }, '6.6.6.6')

    const response = await POST(ctx)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    expect(createClient).toHaveBeenCalledWith('https://mock.supabase.co', 'mock-anon-key')
    expect(Resend).toHaveBeenCalledWith('mock-resend-key')
  })

  it('échappe les caractères HTML dans le contenu', async () => {
    const ctx = createContactRequest({
      name: '<script>alert(1)</script>',
      email: 'test@example.com',
      message: 'Message normal',
    }, '7.7.7.7')

    const response = await POST(ctx)
    expect(response.status).toBe(200)
  })
})
