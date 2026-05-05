import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatBot from './ChatBot'

describe('ChatBot', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche l’en-tête du chatbot', () => {
    render(<ChatBot />)

    expect(screen.getByText(/Assistant de Guy/i)).toBeInTheDocument()
    expect(screen.getByText(/En ligne/i)).toBeInTheDocument()
  })

  it('affiche les suggestions au démarrage', () => {
    render(<ChatBot />)

    expect(screen.getByText(/Quelle est ta stack technique ?/i)).toBeInTheDocument()
    expect(screen.getByText(/Tu es disponible pour un projet ?/i)).toBeInTheDocument()
    expect(screen.getByText(/Quels projets as-tu réalisés ?/i)).toBeInTheDocument()
    expect(screen.getByText(/Quels sont tes tarifs ?/i)).toBeInTheDocument()
  })

  it('envoie un message utilisateur et affiche la réponse en streaming', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"text":"Bonjour"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<ChatBot />)

    const input = screen.getByPlaceholderText(/Une question sur mes services/i)
    fireEvent.change(input, { target: { value: 'Quelle est ta stack ?' } })

    const submitButton = screen.getByLabelText(/Envoyer/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Quelle est ta stack ?/i)).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Quelle est ta stack ?' }],
      }),
    })
  })

  it('désactive le bouton d’envoi quand le champ est vide', () => {
    render(<ChatBot />)

    const button = screen.getByLabelText(/Envoyer/i)
    expect(button).toBeDisabled()
  })

  it('affiche le bouton de réinitialisation après le premier message', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"text":"OK"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body: stream }))

    render(<ChatBot />)

    const input = screen.getByPlaceholderText(/Une question sur mes services/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(screen.getByLabelText(/Envoyer/i))

    await waitFor(() => {
      expect(screen.getByText(/Réinitialiser/i)).toBeInTheDocument()
    })
  })
})
