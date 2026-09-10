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

const insertResult: { error: unknown } = { error: null }

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockImplementation(() => Promise.resolve(insertResult)),
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
    insertResult.error = null
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

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      project_type: 'site-vitrine',
      message: 'Bonjour, je souhaite un devis pour un site vitrine professionnel.',
    }, '6.6.6.6')

    const response = await POST(ctx)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('journalise l’échec d’insertion en base sans casser la réponse', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    insertResult.error = {
      code: '42501',
      message: 'new row violates row-level security policy',
      details: 'Failing row contains (Jean Dupont, jean@example.com, ...)',
      hint: null,
    }

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '8.8.8.8')

    const response = await POST(ctx)
    expect(response.status).toBe(200)

    const call = consoleError.mock.calls.find(
      ([label]) => label === '[contact] échec insertion portfolio_contacts'
    )
    if (!call) throw new Error("aucun log d'échec d'insertion émis")

    const serialized = call[1] as string
    const payload = JSON.parse(serialized)
    expect(payload.code).toBe('42501')
    expect(payload.message).toContain('row-level security')
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/)
    // Aucune donnée personnelle du prospect ne doit fuiter dans les logs.
    expect(serialized).not.toContain('jean@example.com')
    expect(serialized).not.toContain('Jean Dupont')

    consoleError.mockRestore()
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
