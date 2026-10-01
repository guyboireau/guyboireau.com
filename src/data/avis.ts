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
  // À AJOUTER quand Guy fournit le texte exact :
  // - Arnault Janvier : son avis Google, recopié tel quel, avec sa date et le lien.
  // - Gilles Boireau (La Lucarne Péniche, père de Guy) : texte validé par lui.
]
