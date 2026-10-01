// Avis clients affichés sur l'accueil (DESIGN.md, « Ton des textes ») :
// - texte recopié MOT POUR MOT, jamais reformulé ni complété ;
// - source vérifiable (avis Google daté, message écrit conservé) ;
// - lien avec Guy indiqué s'il existe (famille, ami).
// Tant que la liste est vide, la section « Avis » ne s'affiche pas.

export interface Avis {
  texte: string
  auteur: string
  /** Activité ou entreprise, et lien avec Guy s'il y en a un. */
  contexte: string
  /** Où l'avis a été donné, avec sa date : « Avis Google, mars 2026 ». */
  source: string
  /** Lien public vers l'avis, quand il existe. */
  lien?: string
}

export const AVIS: Avis[] = [
  {
    // Avis Google 5/5 laissé sur la fiche de Guy, lu « il y a 2 semaines »
    // le 2026-10-01 et transmis par Guy. Texte recopié tel quel.
    texte:
      "J’ai confié la réalisation de mon site à Guy, qui a été très à l’écoute tout le long de la création de celui-là :) Je suis très content du résultat. Merci Guy !",
    auteur: 'Arnault Janvier',
    contexte: 'Maître verrier, client',
    source: 'Avis Google, 5 sur 5, septembre 2026',
    // lien : URL publique de la fiche Google de Guy, à ajouter quand il la fournit.
  },
  // À AJOUTER : Gilles Boireau (La Lucarne Péniche, père de Guy), texte validé
  // par lui, avec la mention du lien familial dans `contexte`.
]
