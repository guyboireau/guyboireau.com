export const prerender = false

import type { APIRoute } from 'astro'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { SYSTEM_PROMPT } from '@/data/system-prompt'

// --- Rate limiting ---
// Map en mémoire : IP → { count, resetAt }
// Limite : 10 messages par tranche de 60 secondes par IP
// TODO: remplacer par Redis / Upstash KV pour production multi-instance
const ipRequests = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 10
const WINDOW_MS = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = ipRequests.get(ip)

  if (!record || now > record.resetAt) {
    // Nouvelle fenêtre
    ipRequests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  if (record.count >= LIMIT) return true

  record.count++
  return false
}

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of ipRequests) {
    if (now > record.resetAt) ipRequests.delete(ip)
  }
}, 5 * 60_000) // toutes les 5 minutes

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
})

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: z.infer<typeof messageSchema>[]
  try {
    const body = await request.json()
    const parsed = chatBodySchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    messages = parsed.data.messages
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps de requête invalide' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const client = new Anthropic({ apiKey })

  const stream = await client.messages.stream({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            controller.enqueue(encoder.encode(chunk))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('[chat API] Anthropic error:', err)
        const message =
          err instanceof Error ? err.message : 'Erreur API inconnue'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}