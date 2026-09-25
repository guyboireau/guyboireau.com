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

  it('se présente comme un assistant IA, pas comme Guy « en ligne »', () => {
    render(<ChatBot />)

    expect(screen.getByText('Assistant IA')).toBeInTheDocument()
    expect(screen.getByText(/pas Guy en personne/i)).toBeInTheDocument()
    expect(screen.queryByText(/En ligne/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Assistant de Guy/i)).not.toBeInTheDocument()
  })

  it('affiche les suggestions au démarrage, formulées à propos de Guy', () => {
    render(<ChatBot />)

    expect(screen.getByText('Quelle est la stack technique de Guy ?')).toBeInTheDocument()
    expect(screen.getByText('Guy est-il disponible pour un projet ?')).toBeInTheDocument()
    expect(screen.getByText('Quels projets Guy a-t-il réalisés ?')).toBeInTheDocument()
    expect(screen.getByText('Quels sont les tarifs de Guy ?')).toBeInTheDocument()
  })

  /**
   * Règlement européen sur l'IA, article 50 §1 : la personne doit savoir
   * qu'elle interagit avec un système d'IA, au plus tard au premier échange.
   * La mention est donc visible AVANT toute saisie, et reliée au champ.
   */
  describe('transparence avant la saisie', () => {
    it('la mention dit : IA, Anthropic, pas de données sensibles, réponses indicatives, pas un devis', () => {
      render(<ChatBot />)
      const mention = document.getElementById('chat-avertissement')!

      expect(mention).toBeVisible()
      expect(mention).toHaveTextContent(/assistant d'intelligence artificielle \(Claude, d'Anthropic\), pas avec Guy/)
      expect(mention).toHaveTextContent(/transmis à Anthropic/)
      expect(mention).toHaveTextContent(/n'y saisissez pas de données sensibles/)
      expect(mention).toHaveTextContent(/peuvent contenir des erreurs/)
      expect(mention).toHaveTextContent(/ne\s+valent pas devis/)
    })

    it('la mention renvoie à la politique de confidentialité', () => {
      render(<ChatBot />)
      expect(screen.getByRole('link', { name: /En savoir plus sur vos données/i })).toHaveAttribute(
        'href',
        '/confidentialite#assistant-ia'
      )
    })

    it('le champ de saisie a un libellé et la mention pour description', () => {
      render(<ChatBot />)
      const champ = screen.getByLabelText(/Votre question à l'assistant IA/i)

      expect(champ).toHaveAttribute('id', 'chat-question')
      expect(champ).toHaveAccessibleDescription(/assistant d'intelligence artificielle/)
      expect(champ).toHaveAttribute('maxLength', '4000')
    })
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

    const input = screen.getByPlaceholderText(/Votre question sur les services de Guy/i)
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

    const input = screen.getByPlaceholderText(/Votre question sur les services de Guy/i)
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
      expect(screen.getByRole('alert')).toHaveTextContent(/une erreur est survenue/i)
    })
  })

  /**
   * Lecteurs d'écran : la réponse arrive par fragments. Les annoncer un par un
   * serait inaudible ; la zone polie annonce le début puis la réponse entière.
   */
  describe('annonces', () => {
    const annonce = () => screen.getByRole('status')

    it('la réponse complète est annoncée, sans la ponctuation Markdown', async () => {
      const encodeur = new TextEncoder()
      const fragments = ['data: {"text":"Guy propose **trois** formules."}\n\n', 'data: [DONE]\n\n']
      let i = 0
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () =>
                i < fragments.length
                  ? { done: false, value: encodeur.encode(fragments[i++]) }
                  : { done: true, value: undefined },
            }),
          },
        })
      )

      render(<ChatBot />)
      expect(annonce()).toHaveTextContent('')

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Vos formules ?' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)

      await waitFor(() =>
        expect(annonce()).toHaveTextContent("Réponse de l'assistant IA : Guy propose trois formules.")
      )
    })

    it('le début de la rédaction est annoncé', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))

      render(<ChatBot />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)

      await waitFor(() => expect(annonce()).toHaveTextContent(/rédige sa réponse/))
    })

    it('un échec n’annonce pas de réponse fantôme', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

      render(<ChatBot />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)

      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
      expect(annonce()).toHaveTextContent('')
    })

    it('chaque bulle dit qui parle, pour les lecteurs d’écran', async () => {
      const encodeur = new TextEncoder()
      let lu = false
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => {
                if (lu) return { done: true, value: undefined }
                lu = true
                return { done: false, value: encodeur.encode('data: {"text":"Bonjour"}\n\n') }
              },
            }),
          },
        })
      )

      render(<ChatBot />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Salut' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)

      await waitFor(() => expect(screen.getByText("Assistant IA :")).toBeInTheDocument())
      expect(screen.getByText('Vous :')).toBeInTheDocument()
    })

    it('réinitialiser vide la conversation et l’annonce', async () => {
      const encodeur = new TextEncoder()
      let lu = false
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => {
                if (lu) return { done: true, value: undefined }
                lu = true
                return { done: false, value: encodeur.encode('data: {"text":"Bonjour"}\n\n') }
              },
            }),
          },
        })
      )

      render(<ChatBot />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Salut' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)
      await waitFor(() => expect(annonce()).toHaveTextContent(/Bonjour/))

      fireEvent.click(screen.getByRole('button', { name: /Réinitialiser la conversation/i }))

      expect(annonce()).toHaveTextContent('')
      expect(screen.getByText('Quelle est la stack technique de Guy ?')).toBeInTheDocument()
    })
  })
})
