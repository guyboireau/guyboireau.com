import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/pages/api/chat'

const mockStreamEvents = [
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Bonjour' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: ' !' } },
]

vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      for (const event of mockStreamEvents) {
        yield event
      }
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

function createChatRequest(messages: { role: string; content: string }[], clientAddress = '127.0.0.1') {
  return {
    request: new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    }),
    clientAddress,
  } as unknown as Parameters<typeof POST>[0]
}

describe('/api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('retourne 500 si la clé Anthropic est manquante', async () => {
    const originalKey = import.meta.env.ANTHROPIC_API_KEY
    import.meta.env.ANTHROPIC_API_KEY = ''

    const ctx = createChatRequest([{ role: 'user', content: 'Hello' }], '10.0.0.2')
    const response = await POST(ctx)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Configuration manquante')

    import.meta.env.ANTHROPIC_API_KEY = originalKey
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
})
