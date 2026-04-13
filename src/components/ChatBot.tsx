import { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'

const SUGGESTIONS = [
  'Quelle est ta stack technique ?',
  'Tu es disponible pour un projet ?',
  'Quels projets as-tu réalisés ?',
  'Quels sont tes tarifs ?',
]

export default function ChatBot() {
  const { messages, send, streaming, error, reset } = useChat()
  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

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

  return (
    <div className="glass-card overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/assets/logo.svg"
              alt="Guy Boireau"
              className="w-9 h-9 rounded-full border border-slate-200 object-contain bg-white"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Assistant de Guy</p>
            <p className="text-xs text-green-500">En ligne</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="h-72 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <p className="text-slate-500 text-sm">
              Pose-moi une question sur mes projets, ma stack ou mes tarifs.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full text-slate-600 hover:border-primary-400 hover:text-primary-500 transition-colors shadow-sm"
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
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-sm shadow-sm shadow-primary-500/20'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                >
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                    <span className="inline-flex gap-1 mt-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  )}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content !== '' && (
                    <span className="animate-pulse ml-0.5 text-primary-400">▋</span>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-white">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Une question sur mes services…"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary !px-4 !py-2 !text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          aria-label="Envoyer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
