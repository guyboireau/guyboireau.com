import { afterEach, describe, expect, it, vi } from 'vitest'
import baseLayout from '../layouts/BaseLayout.astro?raw'
import footer from '../components/Footer.astro?raw'
import contact from '../pages/contact.astro?raw'
import accueil from '../pages/index.astro?raw'
import { mesurer } from './mesure'

describe('mesurer', () => {
  afterEach(() => {
    delete window.umami
  })

  it('envoie le nom de l’évènement, et lui seul', () => {
    const track = vi.fn()
    window.umami = { track }
    mesurer('contact-envoye')
    expect(track.mock.calls).toEqual([['contact-envoye']])
  })

  it('ne lève rien quand le script est absent ou lève lui-même', () => {
    expect(() => mesurer('contact-envoye')).not.toThrow()
    window.umami = {
      track: () => {
        throw new Error('bloqué')
      },
    }
    expect(() => mesurer('contact-envoye')).not.toThrow()
  })
})

describe('script Umami', () => {
  const script = baseLayout.match(/<script\b[^>]*stats\.guyboireau\.com[^>]*>/)?.[0] ?? ''

  // Sans data-domains, les aperçus locaux (localhost, 127.0.0.1) et les bancs
  // de test entraient dans les statistiques de production.
  it('ne mesure que sur le domaine de production', () => {
    expect(script).toMatch(/data-domains="guyboireau\.com"/)
  })
})

describe('liens de contact', () => {
  // Chaque lien tel:, mailto: et LinkedIn de ces pages porte son évènement.
  // Les pages légales (CGV, mentions, confidentialité) n'en portent pas : un
  // clic pour exercer ses droits n'est pas une prise de contact commerciale.
  const liens = (source: string) =>
    source.match(/<a\b[^>]*href="(?:tel:|mailto:|https:\/\/www\.linkedin\.com)[^"]*"[^>]*>/g) ?? []

  it.each([
    ['Footer.astro', footer],
    ['contact.astro', contact],
    ['index.astro', accueil],
  ])('%s : chaque lien porte data-umami-event', (_, source) => {
    const trouves = liens(source)
    expect(trouves.length).toBeGreaterThan(0)
    for (const lien of trouves) {
      const attendu = lien.includes('tel:')
        ? 'clic-telephone'
        : lien.includes('mailto:')
          ? 'clic-email'
          : 'clic-linkedin'
      expect(lien).toContain(`data-umami-event="${attendu}"`)
      expect(lien).toMatch(/data-umami-event-emplacement="[a-z-]+"/)
    }
  })
})
