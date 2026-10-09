import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deposerDemande, lireAvis, lireDisponibilite, phraseDisponibilite, viderCache } from './crm'

const fetchMock = vi.fn()

function configurer() {
  process.env.CRM_URL = 'http://crm.test/'
  process.env.CRM_APIKEY = 'cle-anon'
  process.env.CRM_JWT = 'jeton-site-web'
}

function reponse(status: number, corps?: unknown) {
  return new Response(corps === undefined ? null : JSON.stringify(corps), { status })
}

describe('src/lib/crm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    viderCache()
    configurer()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CRM_URL
    delete process.env.CRM_APIKEY
    delete process.env.CRM_JWT
  })

  describe('deposerDemande', () => {
    const demande = { nom: 'Jean', email: 'jean@example.com', message: 'Un site pour mon atelier', type_projet: null }

    it('poste dans crm.demandes avec le jeton du rôle site_web, sans relire la ligne', async () => {
      fetchMock.mockResolvedValue(reponse(201))
      expect(await deposerDemande(demande)).toBe('deposee')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://crm.test/rest/v1/demandes')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        apikey: 'cle-anon',
        Authorization: 'Bearer jeton-site-web',
        'Content-Profile': 'crm',
        Prefer: 'return=minimal',
      })
      expect(JSON.parse(init.body)).toEqual(demande)
    })

    it('rend « echec » sans lever si la base refuse ou ne répond pas', async () => {
      fetchMock.mockResolvedValueOnce(reponse(401, { message: 'JWT expired' }))
      expect(await deposerDemande(demande)).toBe('echec')
      fetchMock.mockRejectedValueOnce(new Error('timeout'))
      expect(await deposerDemande(demande)).toBe('echec')
    })

    it('ne fait rien sans configuration', async () => {
      delete process.env.CRM_JWT
      expect(await deposerDemande(demande)).toBe('non_configure')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('lectures', () => {
    it('lit la disponibilité avec le profil crm et la garde en cache', async () => {
      fetchMock.mockResolvedValue(reponse(200, [{ statut: 'en_mission', jusqu_au: null, message: null }]))
      expect(await lireDisponibilite()).toEqual({ statut: 'en_mission', jusqu_au: null, message: null })
      await lireDisponibilite()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'Accept-Profile': 'crm' })
    })

    it('rejette une réponse qui ne correspond pas au schéma', async () => {
      const erreur = vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchMock.mockResolvedValue(reponse(200, [{ statut: 'peut-être' }]))
      expect(await lireDisponibilite()).toBeNull()
      erreur.mockRestore()
    })

    it('rend les avis publiés, ou null si le CRM est injoignable', async () => {
      const avis = [{ texte: 'Très content.', auteur: 'A', contexte: 'Client', source: 'Avis Google', lien: null }]
      fetchMock.mockResolvedValueOnce(reponse(200, avis))
      expect(await lireAvis()).toEqual(avis)

      viderCache()
      const erreur = vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))
      expect(await lireAvis()).toBeNull()
      erreur.mockRestore()
    })
  })

  describe('phraseDisponibilite', () => {
    it('le message des réglages prime', () => {
      expect(phraseDisponibilite({ statut: 'en_mission', jusqu_au: '2027-06-30', message: 'Je prends la maintenance.' }))
        .toBe('Je prends la maintenance.')
    })

    it('sans message, une phrase déduite des contrats, sans tiret long', () => {
      const phrases = [
        phraseDisponibilite({ statut: 'disponible', jusqu_au: null, message: null }),
        phraseDisponibilite({ statut: 'en_mission', jusqu_au: '2027-06-01', message: null }),
        phraseDisponibilite({ statut: 'en_mission', jusqu_au: null, message: '  ' }),
      ]
      expect(phrases).toEqual([
        'Disponible pour de nouveaux projets.',
        "En mission jusqu'au 1er juin 2027. Nouveaux projets : démarrage à convenir.",
        'En mission en ce moment. Nouveaux projets : démarrage à convenir.',
      ])
      for (const p of phrases) expect(p).not.toMatch(/[—–]/)
    })
  })
})
