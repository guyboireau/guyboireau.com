import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import PricingSimulator from './PricingSimulator'

/**
 * Le simulateur de la page Services : ce que le visiteur voit comme total est
 * ce qu'il demande ensuite en devis. Un total faux, ou une mention de prix
 * absente, part tel quel dans la demande.
 */
const total = () => screen.getByText('Total création + options').parentElement as HTMLElement
const montant = (texte: string) => texte.replace(/\s/g, '')

describe('PricingSimulator', () => {
  it('affiche la mention des prix nets et le lien vers les CGV', () => {
    render(<PricingSimulator />)

    expect(screen.getByText(/Prix nets — TVA non applicable, art\. 293 B du CGI/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conditions générales de vente' })).toHaveAttribute('href', '/cgv')
  })

  it('part de la mise en service seule, à 490 €', () => {
    render(<PricingSimulator />)

    expect(montant(total().textContent ?? '')).toContain('490€')
    expect(screen.getByRole('link', { name: /Demander ce devis/ })).toHaveAttribute(
      'href',
      '/contact?subject=Devis%20site%20web&budget=490'
    )
  })

  it('ajoute une option cochée au total, et la retire décochée', () => {
    render(<PricingSimulator />)

    const formulaire = screen.getByRole('checkbox', { name: /Formulaire de contact/ })
    fireEvent.click(formulaire)
    expect(montant(total().textContent ?? '')).toContain('550€')

    fireEvent.click(formulaire)
    expect(montant(total().textContent ?? '')).toContain('490€')
  })

  it('un abonnement coché apparaît en mensuel, pas dans le total de création', () => {
    render(<PricingSimulator />)

    fireEvent.click(screen.getByRole('checkbox', { name: /Hébergement \+ domaine/ }))

    expect(montant(total().textContent ?? '')).toContain('490€')
    expect(screen.getByText(/mois d'abonnement/).textContent?.replace(/\s/g, '')).toContain('15€/mois')
    expect(screen.getByRole('link', { name: /Demander ce devis/ }).getAttribute('href')).toContain('monthly=15')
  })

  it('la mise en service ne peut pas être décochée', () => {
    render(<PricingSimulator />)

    expect(screen.getByRole('checkbox', { name: /Mise en service/ })).toBeDisabled()
  })

  it('les boutons − et + ont un nom, et le groupe son libellé', () => {
    // Un bouton qui ne contient qu'un signe est lu « moins » ou « plus » sans
    // dire de quoi. Le nombre affiché est annoncé quand il change.
    render(<PricingSimulator />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Page supplémentaire/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Modification hors abonnement/ }))

    expect(screen.getByRole('group', { name: 'Nombre de pages :' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: "Nombre d'heures :" })).toBeInTheDocument()
    for (const nom of ['Retirer une page', 'Ajouter une page', 'Retirer une heure', 'Ajouter une heure']) {
      expect(screen.getByRole('button', { name: nom })).toHaveAttribute('type', 'button')
    }
    const pages = within(screen.getByRole('group', { name: 'Nombre de pages :' }))
    expect(pages.getByRole('status')).toHaveTextContent('1')
  })

  it('le total est dans une zone annoncée', () => {
    render(<PricingSimulator />)
    expect(total().closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
  })

  it('le nombre de pages supplémentaires multiplie leur prix, sans descendre sous 1', () => {
    render(<PricingSimulator />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Page supplémentaire/ }))

    const moins = screen.getByRole('button', { name: 'Retirer une page' })
    const plus = screen.getByRole('button', { name: 'Ajouter une page' })

    fireEvent.click(plus)
    fireEvent.click(plus)
    expect(montant(total().textContent ?? '')).toContain('790€') // 490 + 3 × 100

    fireEvent.click(moins)
    fireEvent.click(moins)
    fireEvent.click(moins)
    expect(montant(total().textContent ?? '')).toContain('590€') // plancher : 1 page
  })

  it('les heures de modification hors abonnement se comptent de la même façon', () => {
    render(<PricingSimulator />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Modification hors abonnement/ }))

    const moins = screen.getByRole('button', { name: 'Retirer une heure' })
    const plus = screen.getByRole('button', { name: 'Ajouter une heure' })

    fireEvent.click(plus)
    expect(montant(total().textContent ?? '')).toContain('610€') // 490 + 2 × 60

    fireEvent.click(moins)
    fireEvent.click(moins)
    expect(montant(total().textContent ?? '')).toContain('550€') // plancher : 1 heure
  })
})
