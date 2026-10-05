export const prerender = false

import type { APIRoute } from 'astro'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { SYSTEM_PROMPT } from '@/data/system-prompt'
import { chatRateLimiter } from '@/lib/rate-limit'
import { adresseVisiteur } from '@/lib/client-ip'
import { CHAT_MAX_TOKENS } from '@/data/ai-config'
import { configurationAssistant } from '@/lib/assistant-config'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
})

/**
 * Message montré au visiteur quand le fournisseur échoue. Le détail reste dans les
 * journaux du serveur : il exposait l'état du compte (« credit balance is too low… »).
 */
const MESSAGE_INDISPONIBLE =
  "L'assistant est momentanément indisponible. Réessayez plus tard, ou écrivez via le formulaire de contact."

/**
 * Message montré quand l'assistant n'est pas configuré : le visiteur est renvoyé
 * vers le formulaire de contact, sans détail sur la configuration du serveur.
 */
const MESSAGE_NON_CONFIGURE =
  "L'assistant n'est pas disponible pour le moment. Pour toute question, écrivez à Guy via le formulaire de contact."

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = adresseVisiteur(request, clientAddress)
  if (chatRateLimiter(ip)) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  const configuration = configurationAssistant()
  if ('manquantes' in configuration) {
    console.error(
      `[chat API] assistant non configuré, aucun fournisseur contacté : ${configuration.manquantes.join(', ')}`
    )
    return new Response(
      JSON.stringify({ error: MESSAGE_NON_CONFIGURE, code: 'ASSISTANT_NON_CONFIGURE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
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

  // Le relais LiteLLM du VPS (ANTHROPIC_BASE_URL) route le groupe CHAT_MODEL, par
  // exemple « assistant-site », vers Mistral AI.
  const client = new Anthropic({ apiKey: configuration.apiKey, baseURL: configuration.baseURL })

  const stream = await client.messages.stream({
    model: configuration.model,
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
        console.error('[chat API] erreur du fournisseur :', err)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: MESSAGE_INDISPONIBLE })}\n\n`)
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