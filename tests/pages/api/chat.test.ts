import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/pages/api/chat'

let mockStreamEvents: unknown[] = [
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Bonjour' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: ' !' } },
]

/** Quand elle est posée, le flux lève cette erreur après les événements. */
let erreurEnCoursDeFlux: Error | null = null

const EVENEMENTS_PAR_DEFAUT = [...mockStreamEvents]

vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      for (const event of mockStreamEvents) {
        yield event
      }
      if (erreurEnCoursDeFlux) throw erreurEnCoursDeFlux
    },
  }

  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
    }),
  }
})

function createChatRequest(
  messages: { role: string; content: string }[],
  clientAddress = '127.0.0.1',
  entetes: Record<string, string> = {}
) {
  return {
    request: new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...entetes },
      body: JSON.stringify({ messages }),
    }),
    clientAddress,
  } as unknown as Parameters<typeof POST>[0]
}

/** Configuration de production : le relais LiteLLM du VPS et son groupe routé vers Mistral AI. */
const RELAIS = 'http://127.0.0.1:4000'
const GROUPE = 'assistant-site'

describe('/api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamEvents = [...EVENEMENTS_PAR_DEFAUT]
    erreurEnCoursDeFlux = null
    process.env.ANTHROPIC_BASE_URL = RELAIS
    process.env.CHAT_MODEL = GROUPE
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_BASE_URL
    delete process.env.CHAT_MODEL
  })

  /** Lit tout le corps SSE d'une réponse. */
  async function lireFlux(reponse: Response) {
    return await new Response(reponse.body).text()
  }

  it('retourne 429 en cas de rate limiting', async () => {
    const ip = '10.0.0.1'
    // 11 requêtes pour dépasser la limite de 10
    for (let i = 0; i < 10; i++) {
      const ctx = createChatRequest([{ role: 'user', content: `Message ${i}` }], ip)
      await POST(ctx)
    }

    const ctx = createChatRequest([{ role: 'user', content: 'Blocked' }], ip)
    const response = await POST(ctx)

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('Trop de requêtes')
  })

  it('derrière Caddy, le quota est compté par visiteur, pas pour tout le site', async () => {
    // Toutes les requêtes arrivent de 127.0.0.1 en production. Le visiteur
    // réel est dans X-Forwarded-For, posé par Caddy.
    const caddy = '127.0.0.1'
    for (let i = 0; i < 10; i++) {
      await POST(createChatRequest([{ role: 'user', content: `Message ${i}` }], caddy, { 'X-Forwarded-For': '203.0.113.50' }))
    }

    const bloque = await POST(createChatRequest([{ role: 'user', content: 'Encore' }], caddy, { 'X-Forwarded-For': '203.0.113.50' }))
    expect(bloque.status).toBe(429)

    const autre = await POST(createChatRequest([{ role: 'user', content: 'Bonjour' }], caddy, { 'X-Forwarded-For': '203.0.113.51' }))
    expect(autre.status).toBe(200)
  })

  /**
   * B08. La politique de confidentialité, le bandeau du chat et llms.txt déclarent
   * Mistral AI (UE). Le SDK parle le protocole Anthropic : sans relais ni groupe,
   * il partait chez Anthropic (États-Unis), transfert non déclaré. Configuration
   * incomplète = aucun fournisseur contacté, 503, et le visiteur est renvoyé au
   * formulaire de contact.
   */
  describe('configuration incomplète : aucun fournisseur contacté', () => {
    async function constructeur() {
      return vi.mocked((await import('@anthropic-ai/sdk')).default)
    }

    async function attendre503(ip: string) {
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }], ip))
        expect(reponse.status).toBe(503)
        const corps = await reponse.json()
        expect(corps.error).toContain('formulaire de contact')
        expect(corps.code).toBe('ASSISTANT_NON_CONFIGURE')
        expect(await constructeur()).not.toHaveBeenCalled()
        return { corps, espion }
      } finally {
        espion.mockRestore()
      }
    }

    it('sans CHAT_MODEL : 503, pas de repli sur un modèle par défaut', async () => {
      delete process.env.CHAT_MODEL
      await attendre503('10.0.1.1')
    })

    it('sans ANTHROPIC_BASE_URL : 503, rien ne part chez Anthropic en direct', async () => {
      delete process.env.ANTHROPIC_BASE_URL
      await attendre503('10.0.1.2')
    })

    it('ANTHROPIC_BASE_URL vers l\'API Anthropic elle-même : 503', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
      await attendre503('10.0.1.3')
    })

    it('ANTHROPIC_BASE_URL illisible : 503', async () => {
      process.env.ANTHROPIC_BASE_URL = 'pas une url'
      await attendre503('10.0.1.4')
    })

    it('sans clé : 503', async () => {
      const original = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = ''
      try {
        await attendre503('10.0.1.5')
      } finally {
        process.env.ANTHROPIC_API_KEY = original
      }
    })

    it('le détail de la variable manquante va au journal, pas au navigateur', async () => {
      delete process.env.CHAT_MODEL
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
      const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }], '10.0.1.6'))
      const texte = await reponse.text()
      expect(texte).not.toContain('CHAT_MODEL')
      expect(espion).toHaveBeenCalledWith(expect.stringContaining('CHAT_MODEL'))
      espion.mockRestore()
    })
  })

  it('retourne un stream SSE en cas de succès', async () => {
    const ctx = createChatRequest([{ role: 'user', content: 'Quelle est ta stack ?' }], '10.0.0.3')
    const response = await POST(ctx)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')

    const reader = response.body?.getReader()
    expect(reader).toBeDefined()

    if (reader) {
      const chunks: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(new TextDecoder().decode(value))
      }

      const fullText = chunks.join('')
      expect(fullText).toContain('data:')
      expect(fullText).toContain('[DONE]')
    }
  })

  describe('modèle demandé', () => {
    /** Les options passées à messages.stream lors du dernier appel. */
    async function optionsDuDernierAppel() {
      const Anthropic = vi.mocked((await import('@anthropic-ai/sdk')).default)
      const client = Anthropic.mock.results.at(-1)?.value as { messages: { stream: ReturnType<typeof vi.fn> } }
      return client.messages.stream.mock.calls.at(-1)?.[0] as { model: string }
    }

    it('le client vise le relais (ANTHROPIC_BASE_URL), jamais l\'URL par défaut du SDK', async () => {
      await POST(createChatRequest([{ role: 'user', content: 'Salut' }], '10.0.0.4'))
      const Anthropic = vi.mocked((await import('@anthropic-ai/sdk')).default)
      expect(Anthropic).toHaveBeenCalledWith(expect.objectContaining({ baseURL: RELAIS }))
    })

    it('CHAT_MODEL vise un groupe du harnais LiteLLM (« assistant-site »)', async () => {
      await POST(createChatRequest([{ role: 'user', content: 'Salut' }], '10.0.0.5'))
      expect((await optionsDuDernierAppel()).model).toBe(GROUPE)
    })
  })

  it('retourne 400 si le corps de la requête est invalide', async () => {
    const ctx = {
      request: new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
      clientAddress: '10.0.0.4',
    } as unknown as Parameters<typeof POST>[0]

    const response = await POST(ctx)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Corps de requête invalide')
  })

  /**
   * Le flux SSE lui-même. C'est la moitié non couverte de la route (branches à
   * 64 %) et la plus délicate : tout s'y passe APRÈS que la réponse HTTP 200 a
   * été envoyée, donc aucun code de statut ne peut plus signaler un problème.
   */
  describe('flux SSE', () => {
    it('émet un fragment data: par morceau de texte', async () => {
      const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))

      const corps = await lireFlux(reponse)

      expect(corps).toContain('data: {"text":"Bonjour"}')
      expect(corps).toContain('data: {"text":" !"}')
    })

    it('termine par [DONE]', async () => {
      // Le client s'en sert pour distinguer une fin propre d'une coupure.
      const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))

      expect(await lireFlux(reponse)).toContain('data: [DONE]')
    })

    it('ignore les événements qui ne sont pas du texte', async () => {
      // Le SDK émet aussi message_start, content_block_start, ping… Les
      // relayer tels quels ferait apparaître du JSON brut dans la bulle de
      // réponse.
      mockStreamEvents = [
        { type: 'message_start' },
        { type: 'content_block_start', content_block: { type: 'text' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Utile' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{' } },
      ]

      const corps = await lireFlux(
        await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))
      )

      expect(corps).toContain('"text":"Utile"')
      expect(corps).not.toContain('message_start')
      expect(corps).not.toContain('partial_json')
    })

    it('LE CAS QUI COMPTE : une panne EN COURS de génération part dans le flux', async () => {
      // La réponse est déjà un 200 quand Anthropic lâche — surcharge, quota
      // atteint en cours de route, coupure. Sans ce relais, le client verrait
      // le flux se terminer sans [DONE] et resterait sur une réponse tronquée
      // sans savoir qu'elle l'est.
      //
      // Le champ `error` du payload est exactement ce que useChat guette côté
      // client (voir son test « une erreur transmise DANS le flux »).
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
      erreurEnCoursDeFlux = new Error('Overloaded')

      const corps = await lireFlux(
        await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))
      )

      expect(corps).toContain('"error":"L\'assistant est momentanément indisponible.')
      expect(espion).toHaveBeenCalled()
      espion.mockRestore()
    })

    it('le message du fournisseur ne sort jamais vers le navigateur', async () => {
      // Le 2026-10-01, le chat affichait aux visiteurs « Your credit balance is too
      // low to access the Anthropic API… » : l'état du compte n'a rien à faire là.
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
      erreurEnCoursDeFlux = new Error('400 Your credit balance is too low to access the Anthropic API')

      const corps = await lireFlux(
        await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))
      )

      expect(corps).not.toContain('credit balance')
      expect(corps).not.toContain('Anthropic')
      expect(espion).toHaveBeenCalledWith('[chat API] erreur du fournisseur :', erreurEnCoursDeFlux)
      espion.mockRestore()
    })

    it('le texte déjà produit avant la panne n’est pas perdu', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      erreurEnCoursDeFlux = new Error('Overloaded')

      const corps = await lireFlux(
        await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))
      )

      expect(corps).toContain('"text":"Bonjour"')
      vi.restoreAllMocks()
    })

    it('une panne non-Error donne tout de même un message', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      erreurEnCoursDeFlux = 'une chaîne nue' as unknown as Error

      const corps = await lireFlux(
        await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))
      )

      expect(corps).toContain('momentanément indisponible')
      vi.restoreAllMocks()
    })

    it('le flux est refermé même après une panne', async () => {
      // Le `finally { controller.close() }`. Sans lui, la connexion resterait
      // ouverte et le navigateur attendrait indéfiniment.
      vi.spyOn(console, 'error').mockImplementation(() => {})
      erreurEnCoursDeFlux = new Error('KO')

      const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))

      // `text()` ne se résout que si le flux se ferme : le test bloquerait sinon.
      await expect(lireFlux(reponse)).resolves.toBeTypeOf('string')
      vi.restoreAllMocks()
    })

    it('les en-têtes annoncent bien un flux d’événements', async () => {
      // Un mauvais Content-Type fait que le navigateur tamponne la réponse :
      // le texte arrive d'un bloc à la fin, et tout l'intérêt du streaming
      // disparaît sans qu'aucune erreur ne se produise.
      const reponse = await POST(createChatRequest([{ role: 'user', content: 'Salut' }]))

      expect(reponse.headers.get('Content-Type')).toBe('text/event-stream')
      expect(reponse.headers.get('Cache-Control')).toBe('no-cache')
    })
  })
})
