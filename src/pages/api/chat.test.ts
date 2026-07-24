import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { APIContext } from 'astro'

const { mockStream } = vi.hoisted(() => ({ mockStream: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { stream: mockStream }
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  chatRateLimiter: vi.fn(() => false),
}))

import { POST } from './chat'
import { chatRateLimiter } from '@/lib/rate-limit'
import { CLAUDE_MODEL } from '@/data/ai-config'

function ctx(body: unknown, ip = '1.2.3.4'): APIContext {
  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return { request, clientAddress: ip } as unknown as APIContext
}

async function* streamOf(...texts: string[]) {
  for (const text of texts) {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
  }
  yield { type: 'message_stop' }
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chatRateLimiter).mockReturnValue(false)
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockStream.mockReturnValue(streamOf('Bonjour'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renvoie 429 quand le rate limiter bloque', async () => {
    vi.mocked(chatRateLimiter).mockReturnValue(true)
    const res = await POST(ctx({ messages: [{ role: 'user', content: 'salut' }] }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('renvoie 500 si ANTHROPIC_API_KEY est absente', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const res = await POST(ctx({ messages: [{ role: 'user', content: 'salut' }] }))
    expect(res.status).toBe(500)
  })

  it('renvoie 400 si le corps n’est pas du JSON', async () => {
    const res = await POST(ctx('pas du json'))
    expect(res.status).toBe(400)
  })

  it('renvoie 400 si le schéma est invalide (messages vide)', async () => {
    const res = await POST(ctx({ messages: [] }))
    expect(res.status).toBe(400)
  })

  it('renvoie 400 si content dépasse 4000 caractères', async () => {
    const res = await POST(ctx({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] }))
    expect(res.status).toBe(400)
  })

  it('streame la réponse en SSE et termine par [DONE]', async () => {
    const res = await POST(ctx({ messages: [{ role: 'user', content: 'salut' }] }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    const text = await res.text()
    expect(text).toContain('data: {"text":"Bonjour"}')
    expect(text).toContain('data: [DONE]')
  })

  it('appelle Anthropic avec le modèle configuré', async () => {
    await POST(ctx({ messages: [{ role: 'user', content: 'salut' }] }))
    expect(mockStream).toHaveBeenCalledWith(expect.objectContaining({ model: CLAUDE_MODEL }))
  })

  it('émet un événement error dans le flux si le SDK échoue', async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]() {
        return { next: () => Promise.reject(new Error('boom')) }
      },
    })
    const res = await POST(ctx({ messages: [{ role: 'user', content: 'salut' }] }))
    const text = await res.text()
    expect(text).toContain('"error"')
    expect(text).toContain('boom')
  })
})
