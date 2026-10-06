import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * `@typescript-eslint/no-explicit-any` est en erreur (config recommandée) ; la seule
 * échappatoire est un commentaire `eslint-disable`. Ce test la ferme pour le code de
 * production (les tests restent libres de typer leurs doubles comme ils l'entendent).
 */
const RACINE = resolve(process.cwd(), 'src')

function fichiersDeProduction(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) return fichiersDeProduction(chemin)
    if (!/\.(ts|tsx|astro)$/.test(nom) || /\.test\.(ts|tsx)$/.test(nom) || nom.endsWith('.d.ts')) return []
    return [chemin]
  })
}

describe('aucun any dans le code de production', () => {
  it('aucune dérogation à no-explicit-any sous src/ (hors tests)', () => {
    const derogations = fichiersDeProduction(RACINE).flatMap((chemin) =>
      readFileSync(chemin, 'utf8')
        .split('\n')
        .map((ligne, i) => ({ ligne, n: i + 1 }))
        .filter(({ ligne }) => /eslint-disable.*no-explicit-any/.test(ligne))
        .map(({ n }) => `src/${relative(RACINE, chemin)}:${n}`)
    )
    expect(derogations).toEqual([])
  })
})
