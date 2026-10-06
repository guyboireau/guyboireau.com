import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * B06. Les migrations passent (sur le VPS par `migrer.sh`, ailleurs par
 * `supabase db push`) dans une transaction par fichier, avec l'enregistrement de
 * leur version. Un `commit;` interne valide la migration avant cet enregistrement
 * et casse l'atomicité : en cas d'échec ensuite, la migration est faite mais pas
 * notée, et sera rejouée.
 */
const DOSSIER = resolve(process.cwd(), 'supabase/migrations')
const migrations = readdirSync(DOSSIER).filter((f) => f.endsWith('.sql'))

describe('migrations Supabase', () => {
  it('le dossier existe et contient des migrations', () => {
    expect(migrations.length).toBeGreaterThan(0)
  })

  it.each(migrations)('%s : nom <chiffres>_<nom>.sql', (fichier) => {
    expect(fichier).toMatch(/^\d+_[a-z0-9_]+\.sql$/)
  })

  it.each(migrations)('%s : aucun begin; / commit; / rollback; (le pipeline enveloppe déjà)', (fichier) => {
    // `end;` n'est pas cherché : c'est aussi la fin d'un bloc plpgsql ($$ … end; $$).
    const sansCommentaires = readFileSync(resolve(DOSSIER, fichier), 'utf8').replace(/--.*$/gm, '')
    expect(sansCommentaires).not.toMatch(/^\s*(begin|start\s+transaction|commit|rollback)\s*;/im)
  })
})
