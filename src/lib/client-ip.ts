import { isIP } from 'node:net'

/**
 * Adresse du visiteur, clé de la limitation de débit de /api/chat et /api/contact.
 *
 * En production, le site tourne derrière Caddy, sur le même serveur. Astro
 * (adaptateur Node) ne voit donc que l'adresse de Caddy — 127.0.0.1 ou ::1 — et
 * ne lit `X-Forwarded-For` que si `security.allowedDomains` est configuré, ce
 * que `astro.config.vps.mjs` ne fait pas. Résultat avant ce module : tous les
 * visiteurs partageaient le même quota, 10 messages de chat et 5 envois de
 * contact par minute pour tout le site.
 *
 * Règle retenue :
 *  - connexion venue de la boucle locale → c'est le mandataire local (Caddy) :
 *    on prend la première adresse de `X-Forwarded-For`. Sans `trusted_proxies`,
 *    Caddy remplace cet en-tête par l'adresse réelle du client au lieu de
 *    compléter celui qu'il reçoit : un visiteur ne peut pas y glisser une
 *    fausse adresse ;
 *  - connexion venue d'ailleurs → l'en-tête est ignoré : un client direct
 *    pourrait le forger pour changer de quota à chaque requête.
 *
 * Si un autre mandataire (CDN) est un jour placé devant Caddy, cette règle est
 * à revoir en même temps que `trusted_proxies`.
 */

const BOUCLE_LOCALE_V4 = /^127\./

/** Vrai pour 127.0.0.0/8, ::1 et leur forme IPv4 mappée en IPv6 (::ffff:127.x.x.x). */
export function estBoucleLocale(adresse: string): boolean {
  const normalisee = adresse.trim().toLowerCase()
  if (normalisee === '::1') return true
  const v4 = normalisee.startsWith('::ffff:') ? normalisee.slice('::ffff:'.length) : normalisee
  return isIP(v4) === 4 && BOUCLE_LOCALE_V4.test(v4)
}

export function adresseVisiteur(request: Request, clientAddress: string | undefined): string {
  const directe = clientAddress?.trim() ?? ''
  if (!directe) return 'unknown'
  if (!estBoucleLocale(directe)) return directe

  const premiere = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  return isIP(premiere) ? premiere : directe
}
