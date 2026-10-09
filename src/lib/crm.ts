/**
 * Lien avec le CRM (appli agent-freelance), qui vit dans la même base que le
 * site : la pile Supabase auto-hébergée du VPS.
 *
 * Le site y entre avec un rôle Postgres à lui, `site_web`, par un jeton signé
 * par la pile (CRM_JWT). Ce rôle ne peut que déposer une demande de contact et
 * lire deux vues publiques : les avis publiés et la disponibilité. Le jeton
 * reste côté serveur : process.env, jamais import.meta.env ni PUBLIC_.
 *
 * Sans les trois variables (dev local, aperçus Vercel), tout se désactive :
 * le formulaire n'envoie que l'email, les îlots retombent sur leur repli.
 */

import { z } from 'zod'

const DELAI_MS = 2500
const CACHE_MS = 5 * 60 * 1000

interface Config {
  url: string
  apikey: string
  jwt: string
}

function config(): Config | null {
  const url = process.env.CRM_URL
  const apikey = process.env.CRM_APIKEY
  const jwt = process.env.CRM_JWT
  if (!url || !apikey || !jwt) return null
  return { url: url.replace(/\/+$/, ''), apikey, jwt }
}

function entetes(c: Config, profil: 'Accept-Profile' | 'Content-Profile'): Record<string, string> {
  return {
    apikey: c.apikey,
    Authorization: `Bearer ${c.jwt}`,
    [profil]: 'crm',
  }
}

// ------------------------------------------------------------
// Demandes
// ------------------------------------------------------------

export interface NouvelleDemande {
  nom: string
  email: string
  message: string
  type_projet: string | null
}

export type ResultatDepot = 'deposee' | 'non_configure' | 'echec'

/** Dépose la demande dans le CRM. Ne lève jamais : le formulaire a aussi l'email. */
export async function deposerDemande(demande: NouvelleDemande): Promise<ResultatDepot> {
  const c = config()
  if (!c) return 'non_configure'
  try {
    const reponse = await fetch(`${c.url}/rest/v1/demandes`, {
      method: 'POST',
      headers: {
        ...entetes(c, 'Content-Profile'),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(demande),
      signal: AbortSignal.timeout(DELAI_MS),
    })
    return reponse.ok ? 'deposee' : 'echec'
  } catch {
    return 'echec'
  }
}

// ------------------------------------------------------------
// Vues publiques, gardées 5 minutes en mémoire
// ------------------------------------------------------------

const disponibiliteSchema = z.object({
  statut: z.enum(['disponible', 'en_mission']),
  jusqu_au: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  message: z.string().nullable(),
})
export type Disponibilite = z.infer<typeof disponibiliteSchema>

const avisSchema = z.object({
  texte: z.string(),
  auteur: z.string(),
  contexte: z.string(),
  source: z.string(),
  lien: z.string().url().nullable(),
})
export type AvisCrm = z.infer<typeof avisSchema>

const cache = new Map<string, { valeur: unknown; expire: number }>()

/** Pour les tests. */
export function viderCache(): void {
  cache.clear()
}

/**
 * Lit une vue et la valide. En cas d'échec, rend la dernière valeur connue
 * plutôt que rien : un CRM momentanément injoignable ne vide pas le site.
 */
async function lireVue<T>(vue: string, schema: z.ZodType<T>): Promise<T | null> {
  const c = config()
  if (!c) return null
  const enCache = cache.get(vue)
  if (enCache && enCache.expire > Date.now()) return enCache.valeur as T
  try {
    const reponse = await fetch(`${c.url}/rest/v1/${vue}`, {
      headers: entetes(c, 'Accept-Profile'),
      signal: AbortSignal.timeout(DELAI_MS),
    })
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
    const valeur = schema.parse(await reponse.json())
    cache.set(vue, { valeur, expire: Date.now() + CACHE_MS })
    return valeur
  } catch (e) {
    console.error(`[crm] lecture de ${vue} impossible :`, e instanceof Error ? e.message : e)
    return enCache ? (enCache.valeur as T) : null
  }
}

export async function lireDisponibilite(): Promise<Disponibilite | null> {
  const lignes = await lireVue('vitrine_disponibilite', z.array(disponibiliteSchema))
  return lignes?.[0] ?? null
}

export async function lireAvis(): Promise<AvisCrm[] | null> {
  return lireVue('vitrine_avis', z.array(avisSchema))
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`
}

/**
 * La phrase affichée. Le message saisi dans les réglages du CRM prime ;
 * sinon une phrase neutre, déduite des contrats de régie en cours.
 */
export function phraseDisponibilite(d: Disponibilite): string {
  if (d.message?.trim()) return d.message.trim()
  if (d.statut === 'disponible') return 'Disponible pour de nouveaux projets.'
  return d.jusqu_au
    ? `En mission jusqu'au ${dateLongue(d.jusqu_au)}. Nouveaux projets : démarrage à convenir.`
    : 'En mission en ce moment. Nouveaux projets : démarrage à convenir.'
}
