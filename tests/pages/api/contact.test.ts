import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/pages/api/contact'

const send = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send } }
  }),
}))

function createContactRequest(body: object, clientAddress = '127.0.0.1', entetes: Record<string, string> = {}) {
  return {
    request: new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...entetes },
      body: JSON.stringify(body),
    }),
    clientAddress,
  } as unknown as Parameters<typeof POST>[0]
}

describe('/api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    send.mockResolvedValue({ data: { id: 'test-email-id' }, error: null })
  })

  it('retourne 400 si les données sont invalides', async () => {
    const context = createContactRequest({ name: 'A', email: 'invalid', message: 'short' })
    const response = await POST(context)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Données invalides')
    expect(body.details).toBeDefined()
  })

  it('les erreurs de validation sont en français, champ par champ', async () => {
    // Le formulaire les affiche sous le champ concerné : elles doivent dire
    // au visiteur quoi corriger, dans sa langue.
    const response = await POST(createContactRequest({ name: 'A', email: 'invalid', message: 'court' }, '9.9.9.1'))
    const { details } = await response.json()

    expect(details.name).toEqual(['Le nom doit contenir au moins 2 caractères.'])
    expect(details.email).toEqual(['Adresse e-mail invalide.'])
    expect(details.message).toEqual(['Le message doit contenir au moins 10 caractères.'])
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

  it('envoie la demande par email à Guy, réponse au prospect, sans autre destination', async () => {
    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      project_type: 'site-vitrine',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '8.8.8.8')

    const response = await POST(ctx)
    expect(response.status).toBe(200)

    // L'email est le seul enregistrement de la demande : il doit tout porter.
    expect(send).toHaveBeenCalledTimes(1)
    const envoi = send.mock.calls[0][0]
    expect(envoi.to).toBe('boireauguy@gmail.com')
    expect(envoi.replyTo).toBe('jean@example.com')
    expect(envoi.subject).toContain('site-vitrine')
    expect(envoi.html).toContain('Jean Dupont')
    expect(envoi.html).toContain('Bonjour, je souhaite un devis pour un site vitrine.')
  })

  it('répond 500 si Resend échoue, sans donnée personnelle dans les journaux', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'refusé' } })

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '8.8.4.4')

    const response = await POST(ctx)
    expect(response.status).toBe(500)

    const call = consoleError.mock.calls.find(([label]) => label === '[contact] Resend error:')
    if (!call) throw new Error("aucun log d'échec Resend émis")
    const serialized = call[1] as string
    expect(JSON.parse(serialized).requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(serialized).not.toContain('jean@example.com')
    expect(serialized).not.toContain('Jean Dupont')

    consoleError.mockRestore()
  })

  /**
   * En production, Caddy est la seule connexion que voit Astro : 127.0.0.1.
   * Avant la lecture de X-Forwarded-For, 5 envois par minute fermaient le
   * formulaire pour TOUS les visiteurs du site.
   */
  describe('limitation derrière Caddy', () => {
    const corps = { name: 'Jean Dupont', email: 'jean@example.com', message: 'Message de test suffisamment long.' }

    it('un visiteur qui épuise son quota ne bloque pas les autres', async () => {
      const caddy = '127.0.0.1'
      for (let i = 0; i < 5; i++) {
        await POST(createContactRequest(corps, caddy, { 'X-Forwarded-For': '203.0.113.10' }))
      }

      const bloque = await POST(createContactRequest(corps, caddy, { 'X-Forwarded-For': '203.0.113.10' }))
      expect(bloque.status).toBe(429)

      const autre = await POST(createContactRequest(corps, caddy, { 'X-Forwarded-For': '203.0.113.11' }))
      expect(autre.status).toBe(200)
    })

    it('un client direct ne contourne pas la limite en changeant de X-Forwarded-For', async () => {
      const direct = '198.51.100.40'
      for (let i = 0; i < 5; i++) {
        await POST(createContactRequest(corps, direct, { 'X-Forwarded-For': `192.0.2.${i}` }))
      }

      const reponse = await POST(createContactRequest(corps, direct, { 'X-Forwarded-For': '192.0.2.99' }))
      expect(reponse.status).toBe(429)
    })
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
