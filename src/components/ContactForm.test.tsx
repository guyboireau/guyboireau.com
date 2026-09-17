import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContactForm from './ContactForm'

describe('ContactForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche tous les champs du formulaire', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Type de projet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Envoyer le message/i })).toBeInTheDocument()
  })

  it('affiche le type de projet par défaut quand fourni', () => {
    render(<ContactForm defaultType="site-vitrine" />)
    const select = screen.getByLabelText(/Type de projet/i) as HTMLSelectElement
    expect(select.value).toBe('site-vitrine')
  })

  it('met à jour les champs lors de la saisie', () => {
    render(<ContactForm />)

    const nameInput = screen.getByLabelText(/Nom/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Jean Dupont' } })
    expect(nameInput.value).toBe('Jean Dupont')

    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } })
    expect(emailInput.value).toBe('jean@example.com')

    const messageInput = screen.getByLabelText(/Message/i) as HTMLTextAreaElement
    fireEvent.change(messageInput, { target: { value: 'Bonjour, je voudrais un site vitrine.' } })
    expect(messageInput.value).toBe('Bonjour, je voudrais un site vitrine.')
  })

  it('affiche un message de succès après envoi réussi', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Jean Dupont' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jean@example.com' } })
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Bonjour, je voudrais un site vitrine.' } })

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }))

    await waitFor(() => {
      expect(screen.getByText(/Message envoyé/i)).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jean Dupont',
        email: 'jean@example.com',
        message: 'Bonjour, je voudrais un site vitrine.',
      }),
    })
  })

  it('affiche un message d’erreur en cas d’échec', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', mockFetch)

    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Jean Dupont' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jean@example.com' } })
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Bonjour, je voudrais un site vitrine.' } })

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }))

    await waitFor(() => {
      expect(screen.getByText(/Erreur lors de l'envoi/i)).toBeInTheDocument()
    })
  })

  it('désactive le bouton pendant la soumission', async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('fetch', mockFetch)

    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Jean Dupont' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jean@example.com' } })
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Bonjour, je teste !' } })

    const button = screen.getByRole('button', { name: /Envoyer le message/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Envoi en cours/i })).toBeDisabled()
    })
  })

  /**
   * Les branches non couvertes du composant : la construction de la charge
   * utile et la remontée des erreurs de validation du serveur.
   *
   * Ce n'est pas du détail. Ce formulaire est le seul moyen qu'a un prospect
   * de joindre Guy : un champ perdu en route, ou une erreur de validation qui
   * ne s'affiche pas, c'est un contact qui ne se fait pas — sans rien dans
   * aucun journal pour le dire.
   */
  describe('envoi', () => {
    const remplir = () => {
      fireEvent.change(screen.getByLabelText(/Nom/i), { target: { name: 'name', value: '  Jean Dupont  ' } })
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { name: 'email', value: '  jean@example.com  ' } })
      fireEvent.change(screen.getByLabelText(/Message/i), { target: { name: 'message', value: '  Bonjour, un projet.  ' } })
    }

    const soumettre = () =>
      fireEvent.submit(screen.getByRole('button', { name: /Envoyer le message/i }).closest('form')!)

    it('les espaces autour des champs sont retirés avant l’envoi', async () => {
      // Un nom ou un e-mail avec des espaces de bord finit tel quel en base et
      // dans le mail. Sur l'e-mail, c'est une réponse impossible à envoyer.
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
      global.fetch = fetchMock as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const corps = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(corps.name).toBe('Jean Dupont')
      expect(corps.email).toBe('jean@example.com')
      expect(corps.message).toBe('Bonjour, un projet.')
    })

    it('un type de projet non choisi n’est pas envoyé du tout', async () => {
      // `...(formData.project_type ? { project_type } : {})`. Envoyer une
      // chaîne vide ferait apparaître « Type de projet : » suivi de rien dans
      // le mail reçu.
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
      global.fetch = fetchMock as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('project_type')
    })

    it('un type de projet choisi est transmis', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
      global.fetch = fetchMock as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      fireEvent.change(screen.getByLabelText(/Type de projet/i), {
        target: { name: 'project_type', value: 'site-vitrine' },
      })
      soumettre()

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).project_type).toBe('site-vitrine')
    })

    it('les erreurs de validation du serveur s’affichent sur les champs', async () => {
      // La route renvoie `{ details: { email: ['Email invalide'] } }` sur un
      // 400. Sans cette remontée, le visiteur voit un message d'échec générique
      // sans savoir QUEL champ corriger — et réessaie à l'identique.
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ details: { email: ['Email invalide'] } }),
      }) as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() => expect(screen.getByText(/Email invalide/i)).toBeInTheDocument())
    })

    it('un 400 sans details n’empêche pas l’affichage de l’échec', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      }) as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Envoyer le message/i })).not.toBeDisabled()
      )
    })

    it('une réponse d’erreur au corps illisible ne fait pas planter le composant', async () => {
      // `.json().catch(() => null)` : une passerelle qui renvoie du HTML sur un
      // 502 ferait sinon lever le parsing, et l'exception sortirait du
      // try/catch prévu pour l'échec réseau.
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <')
        },
      }) as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Envoyer le message/i })).not.toBeDisabled()
      )
    })

    it('un envoi réussi vide le formulaire', async () => {
      // Sans la réinitialisation, le visiteur qui veut envoyer un second
      // message réexpédie le premier sans s'en rendre compte.
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() =>
        expect((screen.getByLabelText(/Nom/i) as HTMLInputElement).value).toBe('')
      )
      expect((screen.getByLabelText(/Message/i) as HTMLTextAreaElement).value).toBe('')
    })

    it('un rejet réseau rend la main au visiteur', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Failed to fetch')) as unknown as typeof fetch

      render(<ContactForm />)
      remplir()
      soumettre()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Envoyer le message/i })).not.toBeDisabled()
      )
    })
  })
})
