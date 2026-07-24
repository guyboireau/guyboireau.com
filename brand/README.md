# Identité de marque — Guy Boireau · Agence Web

Kit de marque « Atelier » : sceau `gb`, palette, typographie, et modèles de
factures / devis. Le tout dérive du sceau que tu m'as fourni, redessiné en
vectoriel net pour être lisible à toutes les tailles (favicon → impression).

## Palette

| Rôle | Couleur | Hex |
|------|---------|-----|
| Terracotta (primaire, encre du sceau) | ● | `#a0493b` |
| Terracotta doux | ● | `#b9604b` |
| Crème / ivoire (fond clair) | ● | `#f4ecdd` |
| Vert forêt (fond sombre) | ● | `#25332b` |
| Brun encre (texte) | ● | `#2c2723` |

Sur le site, ces valeurs sont exposées en variables CSS (`--gb-terracotta`,
`--gb-cream`, `--gb-forest`, `--gb-ink`) et en rampe Tailwind `primary-50…700`
(`primary-500` = terracotta).

## Typographie

- **Titres / display** : Cormorant Garamond (serif élégante) —
  auto-hébergée : `assets/cormorant-garamond.woff2` (variable, 300–700, licence OFL).
  Sur le site : utilitaire `font-display` ou variable `--gb-serif`.
- **Texte courant / labels** : sans-serif système (`system-ui`), les labels en
  capitales espacées (`letter-spacing`).

## Logo — variantes (dans `assets/` et `public/assets/`)

| Fichier | Usage |
|---------|-------|
| `logo-seal.svg` | Sceau complet, terracotta — en-têtes sur fond clair |
| `logo-seal-cream.svg` | Sceau complet, crème — sur fond sombre / forêt |
| `logo-mark.svg` | Monogramme `gb` seul (sans anneau ni texte) — usages compacts |
| `public/favicon.svg` | Favicon (disque terracotta + `gb`) |
| `public/apple-touch-icon.png` | Icône iOS 180×180 |
| `public/og-image.png` | Aperçu réseaux sociaux 1200×630 |

Tous les SVG sont **en contours vectoriels** (aucune dépendance police) et à
**fond transparent** — recolorables et détourés.

## Factures & Devis (`factures/`)

- `facture-modele.html` / `devis-modele.html` : modèles **autonomes**, prêts à
  imprimer. Ouvre dans un navigateur → **Ctrl/Cmd + P → Enregistrer en PDF**
  (format A4, couleurs conservées). Un bouton « Imprimer / PDF » est aussi
  présent (masqué à l'impression).
- `facture-exemple.pdf` / `devis-exemple.pdf` : rendus d'exemple.

### À compléter avant envoi (champs entre crochets `[...]`)

- **Adresse** de l'émetteur (obligatoire sur une facture).
- **IBAN / BIC** pour le virement.
- **Client** : nom, adresse, e-mail, éventuel SIRET.
- **Numéro** : `FA-2026-001` / `DV-2026-001` (numérotation continue).
- **Lignes** de prestation, quantités et prix.

### Mentions légales incluses (à vérifier selon ta situation)

- Statut **Entrepreneur Individuel (EI)** + SIRET `993 605 542 00014`.
- **TVA non applicable, art. 293 B du CGI** (régime micro). ⚠️ Si tu es
  assujetti à la TVA, il faut ajouter le taux + le n° de TVA intracommunautaire.
- Pénalités de retard (3× le taux légal) + indemnité forfaitaire de **40 €**.
- Dispense d'immatriculation RCS/RM (à retirer si tu es immatriculé).

## Régénérer les assets

Les assets sont générés par script (Python + fontTools) à partir de la police
Cormorant Garamond. Sources et scripts de génération conservés hors dépôt
(scratchpad de session) ; les fichiers finaux versionnés se trouvent dans
`assets/`, `factures/` et `public/`.
