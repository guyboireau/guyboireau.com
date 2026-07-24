import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { APIContext } from 'astro'

const { mockSend, mockGetSupabase } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSupabase: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

vi.mock('@/lib/supabase.server', () => ({
  getSupabaseServer: mockGetSupabase,
}))

vi.mock('@/lib/rate-limit', () => ({
  contactRateLimiter: vi.fn(async () => false),
}))

import { POST } from './contact'
import { contactRateLimiter } from '@/lib/rate-limit'

function ctx(body: unknown, ip = '1.2.3.4'): APIContext {
  const request = new Request('http://localhost/api/contact', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return { request, clientAddress: ip } as unknown as APIContext
}

const validBody = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  project_type: 'Site vitrine',
  message: 'Bonjour, je voudrais un devis pour un site vitrine.',
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(contactRateLimiter).mockResolvedValue(false)
    mockGetSupabase.mockReturnValue(null)
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null })
    vi.stubEnv('RESEND_API_KEY', 'resend-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renvoie 429 quand le rate limiter bloque', async () => {
    vi.mocked(contactRateLimiter).mockResolvedValue(true)
    const res = await POST(ctx(validBody))
    expect(res.status).toBe(429)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('renvoie 400 quand le schéma est invalide (nom trop court)', async () => {
    const res = await POST(ctx({ ...validBody, name: 'A' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Données invalides')
  })

  it('renvoie 400 quand l’email est invalide', async () => {
    const res = await POST(ctx({ ...validBody, email: 'pas-un-email' }))
    expect(res.status).toBe(400)
  })

  it('renvoie 200 et envoie l’email quand tout est valide', async () => {
    const res = await POST(ctx(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it('échappe le HTML pour prévenir les injections dans l’email', async () => {
    await POST(ctx({ ...validBody, name: '<script>alert(1)</script>' }))
    const emailArg = mockSend.mock.calls[0][0] as { html: string; subject: string }
    expect(emailArg.html).not.toContain('<script>')
    expect(emailArg.html).toContain('&lt;script&gt;')
    expect(emailArg.subject).toContain('&lt;script&gt;')
  })

  it('renvoie 500 si RESEND_API_KEY est absente', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const res = await POST(ctx(validBody))
    expect(res.status).toBe(500)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('renvoie 500 si Resend retourne une erreur', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'envoi échoué' } })
    const res = await POST(ctx(validBody))
    expect(res.status).toBe(500)
  })

  it('insère le contact dans Supabase quand le client est configuré', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({ insert }))
    mockGetSupabase.mockReturnValue({ from })
    const res = await POST(ctx(validBody))
    expect(res.status).toBe(200)
    expect(from).toHaveBeenCalledWith('portfolio_contacts')
    expect(insert).toHaveBeenCalled()
  })
})
