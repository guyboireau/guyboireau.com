import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/pages/api/contact'

const TEM_URL = 'https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails'

// Un seul fetch simulé pour Scaleway TEM et le CRM : chaque test règle la
// réponse de TEM (`tem`) et, dans « dépôt dans le CRM », celle du CRM (`crm`).
const fetchMock = vi.fn()
const tem = vi.fn()
const crm = vi.fn()

/** Corps JSON des envois faits à TEM, dans l'ordre. */
function envoisTem(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => url === TEM_URL)
    .map(([, init]) => JSON.parse((init as RequestInit).body as string))
}

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
    tem.mockReset()
    crm.mockReset()
    tem.mockImplementation(async () => new Response(JSON.stringify({ emails: [{ id: 'test-email-id' }] }), { status: 200 }))
    fetchMock.mockImplementation((url: string) => (url === TEM_URL ? tem() : crm()))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('retourne 500 si la clé Scaleway est manquante', async () => {
    const originalKey = import.meta.env.SCW_SECRET_KEY
    import.meta.env.SCW_SECRET_KEY = ''

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '5.5.5.5')

    const response = await POST(ctx)
    expect(response.status).toBe(500)
    expect(envoisTem()).toHaveLength(0)

    import.meta.env.SCW_SECRET_KEY = originalKey
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
    const envois = envoisTem()
    expect(envois).toHaveLength(1)
    const envoi = envois[0]
    expect(envoi.project_id).toBe(import.meta.env.SCW_PROJECT_ID)
    expect(envoi.from).toEqual({ email: 'formulaire@guyboireau.com', name: 'Portfolio' })
    expect(envoi.to).toEqual([{ email: 'boireauguy@gmail.com' }])
    expect(envoi.additional_headers).toEqual([{ key: 'Reply-To', value: 'jean@example.com' }])
    expect(envoi.subject).toContain('site-vitrine')
    expect(envoi.html).toContain('Jean Dupont')
    expect(envoi.html).toContain('Bonjour, je souhaite un devis pour un site vitrine.')
    expect(envoi.text).toContain('Bonjour, je souhaite un devis pour un site vitrine.')

    const [, init] = fetchMock.mock.calls.find(([url]) => url === TEM_URL)!
    expect((init as RequestInit).headers).toMatchObject({ 'X-Auth-Token': import.meta.env.SCW_SECRET_KEY })
  })

  it('répond 500 si TEM refuse l’envoi, sans donnée personnelle dans les journaux', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    // TEM cite parfois l'adresse fautive dans son message : il ne doit pas fuiter.
    tem.mockResolvedValue(new Response(
      JSON.stringify({ type: 'invalid_arguments', message: 'invalid email jean@example.com' }),
      { status: 400 },
    ))

    const ctx = createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '8.8.4.4')

    const response = await POST(ctx)
    expect(response.status).toBe(500)

    const call = consoleError.mock.calls.find(([label]) => label === '[contact] échec envoi TEM:')
    if (!call) throw new Error("aucun log d'échec TEM émis")
    const serialized = call[1] as string
    expect(JSON.parse(serialized)).toMatchObject({ status: 400, type: 'invalid_arguments' })
    expect(JSON.parse(serialized).requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('jean@example.com')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('Jean Dupont')

    consoleError.mockRestore()
  })

  it('répond 500 si TEM est injoignable, sans lever d’exception non journalisée', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    tem.mockRejectedValue(new DOMException('délai dépassé', 'TimeoutError'))

    const response = await POST(createContactRequest({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }, '8.8.4.5'))

    expect(response.status).toBe(500)
    const call = consoleError.mock.calls.find(([label]) => label === '[contact] échec envoi TEM:')
    if (!call) throw new Error("aucun log d'échec TEM émis")
    expect(JSON.parse(call[1] as string)).toMatchObject({ erreur: 'TimeoutError' })
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
    expect(envoisTem()[0].html).not.toContain('<script>')
  })
  describe('dépôt dans le CRM', () => {
    const corps = {
      name: 'Jean Dupont',
      email: 'jean@example.com',
      project_type: 'site-vitrine',
      message: 'Bonjour, je souhaite un devis pour un site vitrine.',
    }

    beforeEach(() => {
      process.env.CRM_URL = 'http://crm.test'
      process.env.CRM_APIKEY = 'cle-anon'
      process.env.CRM_JWT = 'jeton-site-web'
    })
    afterEach(() => {
      delete process.env.CRM_URL
      delete process.env.CRM_APIKEY
      delete process.env.CRM_JWT
    })

    const appelsCrm = () => fetchMock.mock.calls.filter(([url]) => url !== TEM_URL)

    it('dépose la demande dans crm.demandes, puis envoie l’email', async () => {
      crm.mockResolvedValue(new Response(null, { status: 201 }))
      const response = await POST(createContactRequest(corps, '10.0.0.1'))

      expect(response.status).toBe(200)
      expect(appelsCrm()).toHaveLength(1)
      expect(JSON.parse(appelsCrm()[0][1].body)).toEqual({
        nom: 'Jean Dupont',
        email: 'jean@example.com',
        message: 'Bonjour, je souhaite un devis pour un site vitrine.',
        type_projet: 'site-vitrine',
      })
      expect(envoisTem()).toHaveLength(1)
      // Le CRM d'abord, l'email ensuite.
      expect(fetchMock.mock.calls.map(([url]) => url === TEM_URL)).toEqual([false, true])
    })

    it('répond 200 si seul l’email échoue : la demande est dans le CRM', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      crm.mockResolvedValue(new Response(null, { status: 201 }))
      tem.mockResolvedValue(new Response(JSON.stringify({ type: 'unknown_error' }), { status: 503 }))

      const response = await POST(createContactRequest(corps, '10.0.0.2'))
      expect(response.status).toBe(200)
      consoleError.mockRestore()
    })

    it('répond 200 si TEM est injoignable mais que le CRM a la demande', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      crm.mockResolvedValue(new Response(null, { status: 201 }))
      tem.mockRejectedValue(new TypeError('fetch failed'))

      const response = await POST(createContactRequest(corps, '10.0.0.5'))
      expect(response.status).toBe(200)
      consoleError.mockRestore()
    })

    it('répond 200 si seul le CRM échoue, et le journal ne contient aucune donnée personnelle', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      crm.mockRejectedValue(new Error('ECONNREFUSED'))

      const response = await POST(createContactRequest(corps, '10.0.0.3'))
      expect(response.status).toBe(200)
      const journal = JSON.stringify(consoleError.mock.calls)
      expect(journal).toContain('[contact] dépôt dans le CRM impossible')
      expect(journal).not.toContain('jean@example.com')
      consoleError.mockRestore()
    })

    it('répond 500 si le CRM et l’email échouent tous les deux', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      crm.mockResolvedValue(new Response(null, { status: 500 }))
      tem.mockResolvedValue(new Response(JSON.stringify({ type: 'unknown_error' }), { status: 503 }))

      const response = await POST(createContactRequest(corps, '10.0.0.4'))
      expect(response.status).toBe(500)
      consoleError.mockRestore()
    })
  })
})
