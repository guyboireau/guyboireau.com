import { useState, useCallback } from 'react'

export type Message = { role: 'user' | 'assistant'; content: string }

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 503 : l'assistant n'est pas configuré côté serveur (aucun fournisseur contacté).
  // Réessayer n'y change rien ; l'interface renvoie vers le formulaire de contact.
  const [indisponible, setIndisponible] = useState(false)

  const send = useCallback(
    async (userText: string) => {
      if (streaming) return
      setError(null)
      setIndisponible(false)

      const newMessages: Message[] = [
        ...messages,
        { role: 'user', content: userText },
      ]
      setMessages(newMessages)
      setStreaming(true)
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
        })

        if (!res.ok || !res.body) {
          if (res.status === 429) throw new Error('RATE_LIMIT')
          if (res.status === 503) throw new Error('INDISPONIBLE')
          throw new Error(`Erreur ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            if (payload === '[DONE]') continue

            let parsed: { text?: string; error?: string } = {}
            try {
              parsed = JSON.parse(payload)
            } catch {
              continue
            }
            const { text, error: apiError } = parsed
            if (apiError) throw new Error(apiError)
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                role: 'assistant',
                content: updated[updated.length - 1].content + (text ?? ''),
              }
              return updated
            })
          }
        }
      } catch (_err) {
        const code = _err instanceof Error ? _err.message : ''
        setIndisponible(code === 'INDISPONIBLE')
        setError(
          code === 'RATE_LIMIT'
            ? 'Trop de messages envoyés. Attendez une minute avant de réessayer.'
            : code === 'INDISPONIBLE'
              ? "L'assistant n'est pas disponible pour le moment. Pour toute question, passez par le formulaire de contact."
              : 'Une erreur est survenue. Réessayez dans un instant.'
        )
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setStreaming(false)
      }
    },
    [messages, streaming]
  )

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
    setIndisponible(false)
  }, [])

  return { messages, send, streaming, error, indisponible, reset }
}