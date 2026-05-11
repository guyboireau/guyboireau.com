export const prerender = false

import type { APIRoute } from 'astro'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { SYSTEM_PROMPT } from '@/data/system-prompt'
import { chatRateLimiter } from '@/lib/rate-limit'
import { CLAUDE_MODEL, CHAT_MAX_TOKENS } from '@/data/ai-config'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
})

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown'
  if (chatRateLimiter(ip)) {
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
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || 'form'
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      return new Response(
        JSON.stringify({ error: 'Données invalides', details: fieldErrors }),
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
    model: CLAUDE_MODEL,
    max_tokens: CHAT_MAX_TOKENS,
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