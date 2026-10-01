import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT } from './system-prompt'

/**
 * Le prompt décide de ce que l'assistant dit aux visiteurs. Jusqu'au
 * 2026-09-25, il le faisait parler au nom de Guy, à la première personne :
 * un visiteur pouvait croire écrire à Guy. Contraire à l'obligation de
 * transparence du règlement européen sur l'IA (art. 50 §1), et trompeur.
 *
 * Ces tests figent les consignes qui comptent juridiquement ; ils ne prouvent
 * pas que le modèle les suit, seulement qu'on ne les retire pas par mégarde.
 */
describe('prompt système de l’assistant', () => {
  it('se présente comme un assistant IA, qui n’est pas Guy', () => {
    expect(SYSTEM_PROMPT).toMatch(/assistant d'intelligence artificielle/)
    expect(SYSTEM_PROMPT).toMatch(/Tu n'es pas Guy Boireau et tu ne te fais jamais passer pour lui/)
    expect(SYSTEM_PROMPT).toMatch(/réponds clairement que tu es l'assistant IA du site, pas Guy/)
  })

  it('parle de Guy à la troisième personne, jamais au « je »', () => {
    expect(SYSTEM_PROMPT).toMatch(/à la troisième personne/)
    expect(SYSTEM_PROMPT).not.toMatch(/première personne/)
    expect(SYSTEM_PROMPT).not.toMatch(/en son nom/)
  })

  it('présente les tarifs comme indicatifs : seul le devis engage', () => {
    expect(SYSTEM_PROMPT).toMatch(/seul le devis signé engage Guy/)
    expect(SYSTEM_PROMPT).toMatch(/TVA non applicable, art\. 293 B du CGI/)
  })

  it('ne collecte pas de données personnelles dans la conversation', () => {
    expect(SYSTEM_PROMPT).toMatch(/Ne demande pas de coordonnées ni d'autres données personnelles/)
    expect(SYSTEM_PROMPT).toMatch(/données sensibles/)
  })

  it('reprend le statut exact de l’éditeur', () => {
    expect(SYSTEM_PROMPT).toContain('Guy Boireau EI')
    expect(SYSTEM_PROMPT).toContain('micro-entreprise')
    expect(SYSTEM_PROMPT).not.toMatch(/Auto-entrepreneur/i)
  })

  it('donne l’intitulé exact du diplôme', () => {
    expect(SYSTEM_PROMPT).toContain('Mastère Expert en développement Web, titre RNCP de niveau 7')
    expect(SYSTEM_PROMPT).not.toMatch(/Master 2/)
  })

  it('n’annonce plus Vercel comme hébergeur des sites migrés sur le VPS', () => {
    const lignesProjets = SYSTEM_PROMPT.split('\n').filter((l) => /^(Stack|Hébergement) :/.test(l))
    expect(lignesProjets.length).toBeGreaterThan(0)
    for (const ligne of lignesProjets) expect(ligne).not.toContain('Vercel')
    expect(SYSTEM_PROMPT.match(/serveur privé virtuel \(VPS\) OVHcloud/g)).toHaveLength(2)
  })
})
