// Début de l'expérience professionnelle : alternance chez Bassetti, octobre 2022.
export const DEBUT_EXPERIENCE = new Date('2022-10-01T00:00:00Z')

const ANNEE_MS = 365.25 * 24 * 60 * 60 * 1000

/**
 * Années d'expérience, arrondies à l'année la plus proche :
 * 3 ans et 11 mois s'affichent « 4 ans ».
 */
export function anneesExperience(maintenant: Date = new Date()): number {
  const ecart = maintenant.getTime() - DEBUT_EXPERIENCE.getTime()
  return Math.max(0, Math.round(ecart / ANNEE_MS))
}
