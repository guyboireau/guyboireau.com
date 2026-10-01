# DESIGN.md · guyboireau.com

Ce fichier fait foi. Tout choix visuel ou rédactionnel du site en découle.
Un choix absent d'ici s'ajoute ici avant d'être appliqué dans le code.

## Direction

Un carnet d'atelier tenu par un développeur : papier crème et serif pour
accueillir, blocs factuels en chasse fixe pour prouver.

- Accueil, à propos, projets : ambiance atelier (fond crème, titres serif).
- Hébergement, automatisations, traitement documentaire : mêmes bases, plus de
  blocs techniques en chasse fixe (faits mesurables, pas d'adjectifs).

Références retenues : l'esprit artisanal de hiutdenim.co.uk pour l'accueil,
la sobriété factuelle de fly.io pour les blocs techniques.

## Couleurs

Toutes exposées en variables CSS dans `src/styles/global.css` (bloc `@theme`).
Aucune couleur écrite en dur dans les composants.

| Rôle | Jeton Tailwind | Hex | Usage |
|------|----------------|-----|-------|
| Principale | `primary-500` | `#a0493b` | Boutons, liens, accents. Terracotta du sceau. |
| Principale foncée | `primary-600` / `primary-700` | `#8a3d31` / `#6f3026` | Survol, texte terracotta sur fond clair |
| Accent | `foret` | `#25332b` | Blocs techniques, pied de page |
| Fond | `papier` | `#faf5ec` | Fond de page |
| Fond alterné | `creme` | `#f4ecdd` | Sections alternées, cartes sur fond papier |
| Ligne | `ligne` | `#e0d3bd` | Bordures, séparateurs |
| Texte | `encre` | `#2c2723` | Titres et texte courant (13,6:1 sur papier) |
| Texte secondaire | `encre-2` | `#5a4f46` | Paragraphes secondaires (7,3:1) |
| Légende | `encre-3` | `#6e6258` | Légendes, métadonnées (5,4:1) |
| Texte sur forêt | `creme` / `creme-sourd` | `#f4ecdd` / `#c9bfa8` | Sur fond forêt (11,3:1 / 7,2:1) |

Les états (succès, erreur) des formulaires gardent le vert et le rouge
fonctionnels : ce sont des messages, pas de la décoration.

Aucun dégradé. La marque est faite d'aplats.

## Typographie

Deux polices chargées, auto-hébergées dans `public/fonts/` (licence OFL) :

- **Cormorant Garamond** (`font-display`) : titres h1 à h3 uniquement.
  Graisses 500 et 600.
- **IBM Plex Mono** (`font-mono`) : étiquettes, prix, chiffres, blocs
  techniques. Graisses 400 et 500.
- Texte courant : police système (`font-sans`), non chargée. Graisses 400
  et 500.

Échelle (mobile → bureau) :

| Élément | Taille | Police |
|---------|--------|--------|
| h1 | 40 → 64 px (`text-4xl md:text-6xl`) | Cormorant 600 |
| h2 | 32 → 40 px (`text-3xl md:text-4xl`) | Cormorant 600 |
| h3 | 22 → 24 px (`text-xl md:text-2xl`) | Cormorant 600 |
| Texte | 17 px (`text-[17px]`, interligne 1,6) | Système 400 |
| Texte d'appui | 18 → 20 px (`text-lg md:text-xl`) | Système 400 |
| Légende, étiquette | 13 px (`text-[13px]`), capitales espacées | Plex Mono 500 |
| Prix, chiffres | 20 → 32 px | Plex Mono 500 |

## Formes

- **Un seul rayon d'arrondi : 4 px** (`rounded`). Boutons, cartes, champs,
  badges, images. Aucune pilule.
- Seule exception : les éléments réellement circulaires (portrait, pastille
  d'état) gardent `rounded-full`, parce qu'ils sont des cercles, pas des
  rectangles arrondis.
- Pas d'ombre portée décorative. Une carte se distingue par sa bordure
  `ligne` ou son fond `creme`.
- Espacements sur une grille de 8 px : classes Tailwind paires
  (`2, 4, 6, 8, 12, 16, 20, 24`). Sections : `py-16 md:py-24`.

### Boutons

- **Principal** (`.btn-primary`) : fond terracotta, texte blanc, 4 px.
  Survol : terracotta foncé. Un seul par écran.
- **Secondaire** (`.btn-secondary`) : bordure 1 px terracotta, texte
  terracotta foncé, fond transparent. Survol : fond `creme`.
- Pas de flèche décorative dans les boutons. Le libellé dit où l'on va.

## Icônes

Un seul jeu : **Lucide** (licence ISC), copié en SVG dans
`src/components/Icone.astro`. Trait de 1,75 px, 20 px par défaut, couleur
héritée (`currentColor`). Décoratives : `aria-hidden="true"`.

Aucun emoji dans l'interface. Les listes à puces utilisent l'icône `check`
ou une puce typographique simple, jamais ✓ ou ✦.

## Mouvement

Seules animations autorisées :

1. **Apparition douce** : opacité de 0 à 1 et décalage de 8 px, 300 ms,
   une seule fois, au premier passage dans l'écran (`.apparition`).
2. **Retour au survol** : changement de couleur ou de bordure, 150 ms.
3. **Retour au clic** : bouton enfoncé de 1 px.

Interdit : particules, parallaxe, défilement détourné (Lenis), curseur
personnalisé, bandeaux qui défilent seuls, inclinaison 3D, lueurs, pulsations,
pastilles qui clignotent.

`prefers-reduced-motion: reduce` coupe tout mouvement : le contenu
s'affiche directement à sa place.

## Ton des textes

- **Vouvoiement** du visiteur. Guy parle **à la première personne** (« je »),
  jamais « nous » : il travaille seul.
- Phrases courtes : 20 mots au plus, une idée par phrase.
- Chaque titre dit concrètement ce qui est fait, pour qui, ou ce que le
  visiteur y gagne. Le titre principal se comprend en 3 secondes.
- Ponctuation : **aucun tiret long (—) ni demi-cadratin (–) comme ponctuation**.
  Point, virgule, deux-points ou parenthèses à la place. Les intervalles de
  prix s'écrivent « de 6 000 à 10 000 € ».
- Pas de liste de trois adjectifs.
- Pas de chiffre, d'avis, de client ou de logo qui ne soit vérifiable.
  Un exemple hypothétique est annoncé comme tel (« cas type »).
- Un avis client se cite **mot pour mot**, avec sa source (avis Google daté,
  message écrit) et le lien éventuel avec Guy. Les règles de ton ci-dessus ne
  s'appliquent pas aux mots du client.

Mots et formules interdits :

> transformer votre, booster, boostez, libérez, potentiel, tout-en-un,
> sur-mesure, clé en main, sans effort, en toute sérénité, solution
> innovante, digital, révolutionner, propulser, à la pointe, de A à Z,
> n'attendez plus, « Simple. Transparent. Sans surprise. », passionné,
> expertise de pointe, écosystème, synergie, accompagnement personnalisé
