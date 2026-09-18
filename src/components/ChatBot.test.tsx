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

  /**
   * Les gardes d'entrée du chat. Elles ne se voient pas à l'usage normal, mais
   * chacune empêche un appel facturé au modèle : un envoi à vide, un envoi
   * pendant qu'une réponse arrive, une suggestion cliquée deux fois.
   */
  describe('gardes d’envoi', () => {
    /** Réponse SSE minimale, pour que `send` aboutisse. */
    const fluxOk = (texte = 'Réponse') => {
      const encodeur = new TextEncoder()
      let done = false
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => {
              if (done) return { done: true, value: undefined }
              done = true
              return {
                done: false,
                value: encodeur.encode(`data: ${JSON.stringify({ text: texte })}\n\n`),
              }
            },
          }),
        },
      } as unknown as Response
    }

    const saisie = () => screen.getByRole('textbox')
    const formulaire = () => saisie().closest('form')!

    it('un message vide n’appelle pas l’API', () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      render(<ChatBot />)
      fireEvent.submit(formulaire())

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('un message fait uniquement d’espaces n’appelle pas l’API', () => {
      // `input.trim()` avant le test de véracité. Sans lui, appuyer sur Entrée
      // avec la barre d'espace enfoncée déclencherait un appel au modèle pour
      // rien.
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: '    ' } })
      fireEvent.submit(formulaire())

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('le message est envoyé sans ses espaces de bord', async () => {
      const fetchMock = vi.fn().mockResolvedValue(fluxOk())
      vi.stubGlobal('fetch', fetchMock)

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: '  Bonjour  ' } })
      fireEvent.submit(formulaire())

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const corps = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(corps.messages.at(-1).content).toBe('Bonjour')
    })

    it('le champ est vidé après envoi', async () => {
      // Sans ça, le visiteur qui appuie deux fois sur Entrée renvoie le même
      // message — et repaie la réponse.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fluxOk()))

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: 'Bonjour' } })
      fireEvent.submit(formulaire())

      await waitFor(() => expect((saisie() as HTMLInputElement).value).toBe(''))
    })

    it('cliquer une suggestion envoie son texte', async () => {
      const fetchMock = vi.fn().mockResolvedValue(fluxOk())
      vi.stubGlobal('fetch', fetchMock)

      render(<ChatBot />)
      const suggestion = screen
        .getAllByRole('button')
        .find((b) => (b.textContent ?? '').length > 5 && b.getAttribute('type') !== 'submit')!
      const texte = suggestion.textContent!

      fireEvent.click(suggestion)

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages.at(-1).content).toBe(texte)
    })

    it('les suggestions disparaissent dès le premier message', async () => {
      // Elles n'ont de sens qu'au démarrage. Les garder afficherait des
      // amorces de conversation au milieu d'un échange déjà engagé.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fluxOk()))

      render(<ChatBot />)
      const avant = screen.getAllByRole('button').length

      fireEvent.change(saisie(), { target: { value: 'Bonjour' } })
      fireEvent.submit(formulaire())

      await waitFor(() => expect(screen.getAllByRole('button').length).toBeLessThan(avant))
    })

    it('la réponse de l’assistant est rendue en Markdown', async () => {
      // Le modèle répond en Markdown. Sans ReactMarkdown, le visiteur lirait
      // les astérisques et les tirets bruts.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fluxOk('Voici **un point** important')))

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: 'Bonjour' } })
      fireEvent.submit(formulaire())

      await waitFor(() => expect(screen.getByText('un point')).toBeInTheDocument())
      expect(document.querySelector('strong')?.textContent).toBe('un point')
      expect(document.body.textContent).not.toContain('**')
    })

    it('le message de l’utilisateur n’est PAS interprété comme du Markdown', async () => {
      // Seules les réponses de l'assistant passent par ReactMarkdown. C'est
      // volontaire : le texte du visiteur doit s'afficher tel qu'il l'a tapé,
      // et ne surtout pas devenir du balisage.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fluxOk('ok')))

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: 'Regarde **ceci**' } })
      fireEvent.submit(formulaire())

      await waitFor(() => expect(screen.getByText('Regarde **ceci**')).toBeInTheDocument())
    })

    it('une erreur du flux est montrée au visiteur', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

      render(<ChatBot />)
      fireEvent.change(saisie(), { target: { value: 'Bonjour' } })
      fireEvent.submit(formulaire())

      await waitFor(() =>
        expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument()
      )
    })
  })
})
