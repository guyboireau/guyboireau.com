/**
 * Opposition à la mesure d'audience (Umami, stats.guyboireau.com).
 *
 * Le script de mesure n'envoie rien tant que `localStorage.getItem('umami.disabled')`
 * renvoie une valeur non vide. Il relit la clé avant chaque envoi : le choix
 * prend effet tout de suite, sans recharger la page.
 *
 * C'est la seule écriture du site dans le navigateur, et elle n'a lieu qu'à la
 * demande de la personne : ce stockage sert uniquement à respecter son choix.
 *
 * Le stockage est passé sous forme de fonction : lire `window.localStorage`
 * peut lever une exception (données de site bloquées, certains modes privés),
 * et cette lecture doit rester dans le try.
 */
export const CLE_OPPOSITION = 'umami.disabled'

export type Stockage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** `indisponible` : le navigateur refuse le stockage local, le choix ne peut pas être enregistré. */
export type EtatMesure = 'active' | 'refusee' | 'indisponible'

export function lireEtatMesure(stockage: () => Stockage | null | undefined): EtatMesure {
  try {
    const s = stockage()
    if (!s) return 'indisponible'
    return s.getItem(CLE_OPPOSITION) ? 'refusee' : 'active'
  } catch {
    return 'indisponible'
  }
}

/**
 * Enregistre le choix, puis relit la clé : l'état renvoyé est celui que le
 * script de mesure verra réellement, pas celui qu'on a demandé.
 */
export function enregistrerChoix(stockage: () => Stockage | null | undefined, refuser: boolean): EtatMesure {
  try {
    const s = stockage()
    if (!s) return 'indisponible'
    if (refuser) s.setItem(CLE_OPPOSITION, '1')
    else s.removeItem(CLE_OPPOSITION)
  } catch {
    return 'indisponible'
  }
  return lireEtatMesure(stockage)
}
