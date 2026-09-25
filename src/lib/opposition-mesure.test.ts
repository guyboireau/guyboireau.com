import { describe, it, expect, beforeEach } from 'vitest'
import { CLE_OPPOSITION, enregistrerChoix, lireEtatMesure, type Stockage } from './opposition-mesure'

/**
 * Le bouton « Ne plus être mesuré sur ce site » de la politique de
 * confidentialité. Ce qui compte : la clé écrite est exactement celle que lit
 * le script Umami, et un navigateur qui refuse le stockage ne fait jamais
 * croire à la personne que son choix est enregistré.
 */
describe('opposition à la mesure d’audience', () => {
  const stockageNavigateur = () => window.localStorage

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('la clé est celle que lit le script Umami', () => {
    expect(CLE_OPPOSITION).toBe('umami.disabled')
  })

  it('par défaut, la mesure est active', () => {
    expect(lireEtatMesure(stockageNavigateur)).toBe('active')
  })

  it('refuser écrit la clé, et la mesure est dite refusée', () => {
    expect(enregistrerChoix(stockageNavigateur, true)).toBe('refusee')
    expect(window.localStorage.getItem('umami.disabled')).toBe('1')
    expect(lireEtatMesure(stockageNavigateur)).toBe('refusee')
  })

  it('réactiver retire la clé', () => {
    enregistrerChoix(stockageNavigateur, true)
    expect(enregistrerChoix(stockageNavigateur, false)).toBe('active')
    expect(window.localStorage.getItem('umami.disabled')).toBeNull()
  })

  it('une valeur vide ne vaut pas refus (Umami ne la considère pas non plus)', () => {
    window.localStorage.setItem('umami.disabled', '')
    expect(lireEtatMesure(stockageNavigateur)).toBe('active')
  })

  it('un refus posé ailleurs (console, autre onglet) est reconnu', () => {
    window.localStorage.setItem('umami.disabled', 'true')
    expect(lireEtatMesure(stockageNavigateur)).toBe('refusee')
  })

  describe('navigateur qui refuse le stockage local', () => {
    const inaccessible = () => {
      throw new DOMException('Accès refusé', 'SecurityError')
    }

    const pleinOuBloque: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota dépassé', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    }

    it('la lecture renvoie « indisponible » au lieu de lever', () => {
      expect(lireEtatMesure(inaccessible)).toBe('indisponible')
      expect(lireEtatMesure(() => null)).toBe('indisponible')
    })

    it('l’écriture renvoie « indisponible » au lieu de lever', () => {
      expect(enregistrerChoix(inaccessible, true)).toBe('indisponible')
      expect(enregistrerChoix(() => undefined, true)).toBe('indisponible')
      expect(enregistrerChoix(() => pleinOuBloque, true)).toBe('indisponible')
    })

    it('une écriture acceptée mais non conservée n’est pas présentée comme un refus', () => {
      // Certains navigateurs acceptent setItem sans rien garder : l'état
      // renvoyé est relu, pas supposé.
      const oublieux: Stockage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
      expect(enregistrerChoix(() => oublieux, true)).toBe('active')
    })
  })
})
