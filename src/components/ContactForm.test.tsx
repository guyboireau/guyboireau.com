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
})
