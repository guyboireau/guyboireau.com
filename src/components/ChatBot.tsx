import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'

const SUGGESTIONS = [
  'Quelle est la stack technique de Guy ?',
  'Guy est-il disponible pour un projet ?',
  'Quels projets Guy a-t-il réalisés ?',
  'Quels sont les tarifs de Guy ?',
]

/** Texte lisible par un lecteur d'écran : sans la ponctuation Markdown. */
const sansMarkdown = (texte: string) => texte.replace(/[*_`#>]+/g, '').replace(/\s+/g, ' ').trim()

/**
 * Assistant IA de la page d'accueil.
 *
 * Transparence (règlement européen sur l'IA, art. 50 §1) : l'interface dit,
 * avant toute saisie, qu'on échange avec un système d'IA et non avec Guy, que
 * les messages partent chez Anthropic et que les réponses sont indicatives.
 */
export default function ChatBot() {
  const { messages, send, streaming, error, reset } = useChat()
  const [input, setInput] = useState('')
  const [annonce, setAnnonce] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const enCoursPrecedent = useRef(false)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Annonce polie : une fois quand la rédaction commence, une fois la réponse
  // complète. Annoncer chaque fragment du flux rendrait la lecture inaudible.
  useEffect(() => {
    if (streaming && !enCoursPrecedent.current) {
      setAnnonce("L'assistant IA rédige sa réponse…")
    } else if (!streaming && enCoursPrecedent.current) {
      const derniere = messages[messages.length - 1]
      setAnnonce(
        derniere?.role === 'assistant' && derniere.content
          ? `Réponse de l'assistant IA : ${sansMarkdown(derniere.content)}`
          : ''
      )
    }
    enCoursPrecedent.current = streaming
  }, [streaming, messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return
    send(text)
    setInput('')
  }

  const handleSuggestion = (text: string) => {
    if (streaming) return
    send(text)
    inputRef.current?.focus()
  }

  const handleReset = () => {
    reset()
    setAnnonce('')
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.svg"
            alt=""
            className="w-9 h-9 rounded-full border border-slate-200 object-contain bg-white"
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm">Assistant IA</p>
            <p className="text-xs text-slate-600">Programme d'intelligence artificielle, pas Guy en personne</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-600 hover:text-slate-800 underline underline-offset-2 transition-colors shrink-0"
          >
            Réinitialiser la conversation
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        data-lenis-prevent
        role="region"
        aria-label="Conversation avec l'assistant IA"
        tabIndex={0}
        className="h-72 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <p className="text-slate-600 text-sm">
              Posez une question sur les services, les projets ou les tarifs de Guy Boireau.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-full text-slate-700 hover:border-primary-500 hover:text-primary-600 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-sm shadow-sm shadow-primary-500/20 whitespace-pre-wrap'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                >
                  <span className="sr-only">{msg.role === 'user' ? 'Vous : ' : "Assistant IA : "}</span>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="mt-1 space-y-0.5 list-none">{children}</ul>,
                        li: ({ children }) => <li className="flex gap-1.5 before:content-['·'] before:text-primary-600 before:font-bold">{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                    <span className="inline-flex gap-1 mt-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  )}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content !== '' && (
                    <span className="animate-pulse motion-reduce:animate-none ml-0.5 text-primary-600" aria-hidden="true">▋</span>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <p role="alert" className="text-xs text-red-700 text-center">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Annonces pour les lecteurs d'écran */}
      <div role="status" aria-live="polite" className="sr-only">
        {annonce}
      </div>

      {/* Mention de transparence, visible avant toute saisie */}
      <p id="chat-avertissement" className="px-4 pt-3 text-xs leading-relaxed text-slate-600 bg-white border-t border-slate-100">
        Vous échangez avec un assistant d'intelligence artificielle (Claude, d'Anthropic), pas avec Guy. Vos messages
        sont transmis à Anthropic, aux États-Unis, pour produire les réponses : n'y saisissez pas de données sensibles
        ni d'informations sur d'autres personnes. Les réponses sont indicatives, peuvent contenir des erreurs et ne
        valent pas devis.{' '}
        <a href="/confidentialite#assistant-ia" className="text-primary-700 underline underline-offset-2 hover:text-primary-600">
          En savoir plus sur vos données
        </a>
      </p>

      {/* Saisie */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 bg-white">
        <label htmlFor="chat-question" className="sr-only">
          Votre question à l'assistant IA
        </label>
        <input
          ref={inputRef}
          id="chat-question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={4000}
          aria-describedby="chat-avertissement"
          placeholder="Votre question sur les services de Guy…"
          className="flex-1 bg-slate-50 border border-slate-500 rounded-xl px-4 py-2 text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary !px-4 !py-2 !text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          aria-label="Envoyer la question"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
