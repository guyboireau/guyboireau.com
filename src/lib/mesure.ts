/**
 * Évènements de conversion envoyés à Umami (stats.guyboireau.com).
 *
 * Les clics sur les liens tel:, mailto: et LinkedIn n'ont pas besoin de ce
 * module : l'attribut `data-umami-event` posé sur le lien suffit, le script
 * Umami l'envoie lui-même. Ce module sert aux évènements qu'aucun clic ne
 * porte, comme l'envoi réussi du formulaire.
 *
 * Condition de l'exemption de consentement (CNIL) : un évènement porte un nom
 * fixe, jamais une donnée saisie par le visiteur (nom, e-mail, message, type
 * de projet).
 *
 * Rien ne part si le script est bloqué, si la personne s'est opposée à la
 * mesure (`umami.disabled`) ou si la page n'est pas servie par le domaine de
 * production (`data-domains`) : le script vérifie tout cela avant chaque envoi.
 */
export type Evenement = 'contact-envoye'

declare global {
  interface Window {
    umami?: { track: (nom: string) => unknown }
  }
}

export function mesurer(evenement: Evenement): void {
  try {
    void window.umami?.track(evenement)
  } catch {
    // La mesure ne doit jamais faire échouer ce qu'elle observe.
  }
}
