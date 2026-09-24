import { describe, expect, it } from 'vitest'
import { anneesExperience } from './experience'

describe('anneesExperience', () => {
  it('affiche 4 ans en septembre 2026 (3 ans et 11 mois)', () => {
    expect(anneesExperience(new Date('2026-09-24T12:00:00Z'))).toBe(4)
  })

  it('reste à 4 ans jusqu’à mi-parcours de la cinquième année', () => {
    expect(anneesExperience(new Date('2027-03-15T12:00:00Z'))).toBe(4)
  })

  it('passe à 5 ans au printemps 2027', () => {
    expect(anneesExperience(new Date('2027-04-15T12:00:00Z'))).toBe(5)
  })

  it('ne renvoie jamais une valeur négative', () => {
    expect(anneesExperience(new Date('2020-01-01T00:00:00Z'))).toBe(0)
  })
})
