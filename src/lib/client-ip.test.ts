import { describe, it, expect } from 'vitest'
import { adresseVisiteur, estBoucleLocale } from './client-ip'

/**
 * La clé de la limitation de débit. Derrière Caddy, l'adresse vue par Astro est
 * toujours celle de la boucle locale : sans ce module, un seul visiteur
 * insistant fermait le chat et le formulaire pour tout le monde.
 *
 * Les deux propriétés qui comptent : derrière le mandataire local, chaque
 * visiteur a sa propre clé ; en connexion directe, l'en-tête X-Forwarded-For
 * ne permet pas de changer de clé à volonté.
 */
const requete = (xff?: string) =>
  new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: xff === undefined ? {} : { 'X-Forwarded-For': xff },
  })

describe('estBoucleLocale', () => {
  it.each(['127.0.0.1', '127.0.0.2', '127.255.255.254', '::1', '::ffff:127.0.0.1', ' ::1 ', '::FFFF:127.0.0.1'])(
    '%s est la boucle locale',
    (adresse) => {
      expect(estBoucleLocale(adresse)).toBe(true)
    }
  )

  it.each(['128.0.0.1', '10.0.0.1', '192.168.1.10', '203.0.113.7', '::ffff:10.0.0.1', '2001:db8::1', 'localhost', '', 'unknown'])(
    '%s ne l’est pas',
    (adresse) => {
      expect(estBoucleLocale(adresse)).toBe(false)
    }
  )
})

describe('adresseVisiteur', () => {
  describe('derrière le mandataire local (Caddy)', () => {
    it('prend l’adresse transmise par X-Forwarded-For', () => {
      expect(adresseVisiteur(requete('203.0.113.7'), '127.0.0.1')).toBe('203.0.113.7')
    })

    it('fonctionne aussi quand Caddy arrive en IPv6 (::1) ou en IPv4 mappée', () => {
      expect(adresseVisiteur(requete('203.0.113.7'), '::1')).toBe('203.0.113.7')
      expect(adresseVisiteur(requete('203.0.113.7'), '::ffff:127.0.0.1')).toBe('203.0.113.7')
    })

    it('ne garde que la première adresse d’une liste', () => {
      expect(adresseVisiteur(requete(' 203.0.113.7 , 10.0.0.1, 127.0.0.1'), '127.0.0.1')).toBe('203.0.113.7')
    })

    it('accepte une adresse IPv6 de visiteur', () => {
      expect(adresseVisiteur(requete('2001:db8::42'), '127.0.0.1')).toBe('2001:db8::42')
    })

    it('deux visiteurs différents ont deux clés différentes', () => {
      const a = adresseVisiteur(requete('203.0.113.7'), '127.0.0.1')
      const b = adresseVisiteur(requete('198.51.100.23'), '127.0.0.1')
      expect(a).not.toBe(b)
    })

    it.each([undefined, '', 'unknown', 'pas une adresse', '203.0.113', '203.0.113.7:443'])(
      'retombe sur l’adresse locale quand l’en-tête vaut %j',
      (xff) => {
        expect(adresseVisiteur(requete(xff), '127.0.0.1')).toBe('127.0.0.1')
      }
    )
  })

  describe('en connexion directe', () => {
    it('garde l’adresse de connexion', () => {
      expect(adresseVisiteur(requete(), '198.51.100.9')).toBe('198.51.100.9')
    })

    it('ignore un X-Forwarded-For forgé par le client', () => {
      // Sinon il suffirait de changer d'en-tête à chaque requête pour ne
      // jamais atteindre la limite.
      expect(adresseVisiteur(requete('203.0.113.7'), '198.51.100.9')).toBe('198.51.100.9')
    })
  })

  it('sans adresse de connexion, ne fait pas confiance à l’en-tête', () => {
    expect(adresseVisiteur(requete('203.0.113.7'), undefined)).toBe('unknown')
    expect(adresseVisiteur(requete('203.0.113.7'), '   ')).toBe('unknown')
  })
})
