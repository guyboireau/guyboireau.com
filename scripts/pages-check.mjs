/**
 * Contrôle, sur le HTML produit par le build, de ce que les tests unitaires ne
 * voient pas : les pages Astro elles-mêmes. Mentions légales, politique de
 * confidentialité, CGV, mentions de prix, accessibilité de base, fichiers
 * destinés aux robots et aux agents d'IA.
 *
 * Chaque règle correspond à une obligation ou à un défaut déjà corrigé une
 * fois : si elle échoue, c'est qu'une modification l'a fait revenir.
 *
 * Lancé par `npm run test:pages`, après `npm run build` (dossier en argument :
 * `.vercel/output/static/` avec l'adaptateur Vercel, `dist/client/` par défaut).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = process.argv[2] ?? new URL('../dist/client/', import.meta.url).pathname;

const pages = [];
const parcourir = (dossier) => {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (nom.endsWith('.html')) pages.push(chemin);
  }
};
parcourir(RACINE);

if (pages.length === 0) {
  console.error(`aucune page HTML dans ${RACINE} — lancer npm run build avant`);
  process.exit(1);
}

const echecs = new Map();
const signaler = (page, probleme) => {
  if (!echecs.has(page)) echecs.set(page, []);
  echecs.get(page).push(probleme);
};

const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const texte = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, ' ');

// ─── Règles communes à toutes les pages ──────────────────────────────────────
for (const chemin of pages) {
  const nom = '/' + relative(RACINE, chemin);
  const html = readFileSync(chemin, 'utf8');

  if (!/<html lang="fr"/.test(html)) signaler(nom, 'langue de la page absente (<html lang="fr">)');
  if (!html.includes('href="#contenu"') || !html.includes('id="contenu"'))
    signaler(nom, "lien d'évitement « Aller au contenu » ou cible #contenu absents");

  for (const lien of ['/mentions-legales', '/confidentialite', '/cgv', '/cgv#mediation']) {
    if (!html.includes(`href="${lien}"`)) signaler(nom, `pied de page : lien ${lien} absent`);
  }
  if (!html.includes('aria-label="Pied de page"')) signaler(nom, 'pied de page : <nav aria-label="Pied de page"> absent');
  if (!texte(html).includes('Guy Boireau EI')) signaler(nom, '« Guy Boireau EI » absent de la page');

  for (const commentaire of html.match(/<!--[\s\S]*?-->/g) ?? []) {
    if (/Google Tag Manager|Umami, auto-hébergé/.test(commentaire))
      signaler(nom, `commentaire interne publié : ${commentaire.slice(0, 60)}…`);
  }

  for (const [, attributs, contenu] of html.matchAll(/<a\b([^>]*\btarget="_blank"[^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (!contenu.includes('(nouvel onglet)')) signaler(nom, `lien en nouvel onglet sans « (nouvel onglet) » : <a${attributs.slice(0, 70)}…`);
  }

  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt=/.test(img)) signaler(nom, `image sans attribut alt : ${img.slice(0, 70)}…`);
  }

  // Titres : pas de saut de niveau (h1 → h3). Le premier titre peut être de
  // n'importe quel niveau, les suivants ne descendent que d'un cran à la fois.
  let precedent = 0;
  for (const [, niveau] of html.matchAll(/<h([1-6])\b/gi)) {
    const n = Number(niveau);
    if (precedent && n > precedent + 1) signaler(nom, `saut de titre h${precedent} → h${n}`);
    precedent = n;
  }
}

// ─── Règles propres à certaines pages ────────────────────────────────────────
const exiger = (chemin, attendus, interdits = []) => {
  const nom = '/' + chemin;
  if (!existsSync(join(RACINE, chemin))) return signaler(nom, 'page absente');
  const html = lire(chemin);
  const contenu = texte(html);
  for (const attendu of attendus) {
    const trouve = attendu instanceof RegExp ? attendu.test(html) || attendu.test(contenu) : html.includes(attendu) || contenu.includes(attendu);
    if (!trouve) signaler(nom, `attendu : ${attendu}`);
  }
  for (const interdit of interdits) {
    const trouve = interdit instanceof RegExp ? interdit.test(contenu) : contenu.includes(interdit);
    if (trouve) signaler(nom, `interdit : ${interdit}`);
  }
};

exiger(
  'mentions-legales/index.html',
  [
    'Guy Boireau EI', 'micro-entreprise', '993 605 542 00014', '62.01Z', '293 B du CGI',
    /Dispensé d.immatriculation au registre du commerce et des sociétés/, 'OVH SAS', '1007',
    '424 761 419', 'serveur privé virtuel', 'href="/confidentialite"', 'href="/cgv#mediation"',
  ],
  [/Auto-entrepreneur/i, 'Données personnelles (RGPD)'],
);

exiger(
  'confidentialite/index.html',
  [
    'id="formulaire-contact"', 'id="assistant-ia"', 'id="mesure-audience"', 'id="journaux"', 'id="e-mails"',
    'id="sauvegardes"', 'id="transferts"', 'id="droits"', 'id="reclamation"', 'id="cookies"',
    'data-opposition-mesure', 'umami.disabled', 'renouvelé chaque mois', '25 mois', '30 jours',
    '3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07', 'Data Privacy Framework',
    '14 copies sont gardées sur le serveur', 'directives post-mortem', 'Ce site ne dépose aucun cookie',
  ],
  ['sel renouvelé chaque jour', 'change chaque jour', /Ces transferts sont encadrés par les clauses contractuelles types/],
);

exiger(
  'cgv/index.html',
  [
    'id="mediation"', 'id="retractation"', 'id="garantie-legale"', 'id="formulaire-retractation"',
    'L221-18', 'L221-24', 'L221-25', 'L221-28, 1°', 'L221-28, 8°', 'L224-25-12', 'L215-1', 'L215-1-1',
    'L441-10', 'D441-5', '40 €', 'R212-1', '293 B du CGI', 'Rayez la mention inutile', 'Guy Boireau EI, 17 rue Beck, 33800 Bordeaux',
  ],
  [/règlement en ligne des litiges/i, 'ec.europa.eu/consumers/odr'],
);

exiger('404.html', [/<meta name="robots" content="noindex/]);
if (existsSync(join(RACINE, '404.html')) && /rel="canonical"/.test(lire('404.html'))) signaler('/404.html', 'URL canonique sur une page noindex');

for (const page of ['index.html', 'services/index.html', 'automatisations/index.html', 'facturation-electronique/index.html', 'hebergement-exploitation/index.html', 'traitement-documentaire/index.html']) {
  exiger(page, ['Prix nets — TVA non applicable, art. 293 B du CGI', 'href="/cgv"']);
}

exiger('index.html', [
  'id="trust-marquee-toggle"', /data-doublon[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-doublon/,
  "assistant d'intelligence artificielle (Claude, d'Anthropic), pas avec Guy", 'Assistant IA',
], ['En ligne', 'Mon assistant répond en direct']);

exiger('contact/index.html', ['3 ans à compter de votre message', 'champ obligatoire', 'href="/confidentialite#formulaire-contact"']);
exiger('a-propos/index.html', ['Mastère Expert en développement Web'], [/Master 2/]);
exiger('hebergement-exploitation/index.html', ['Serveur privé virtuel (VPS) OVHcloud'], [/[Ss]erveur dédié/, 'restent en France']);
exiger('projets/index.html', ['VPS OVHcloud'], [/Vercel/]);

// ─── Fichiers pour les robots et les agents d'IA ─────────────────────────────
const fichier = (chemin) => (existsSync(join(RACINE, chemin)) ? lire(chemin) : null);

const llms = fichier('llms.txt');
if (!llms) signaler('/llms.txt', 'fichier absent');
else {
  if (!/^# \S/.test(llms)) signaler('/llms.txt', 'doit commencer par un titre « # … » (format llmstxt.org)');
  for (const attendu of ['Guy Boireau EI', 'https://guyboireau.com/mentions-legales/', 'https://guyboireau.com/confidentialite/', 'https://guyboireau.com/cgv/'])
    if (!llms.includes(attendu)) signaler('/llms.txt', `attendu : ${attendu}`);
}

const robots = fichier('robots.txt');
if (!robots) signaler('/robots.txt', 'fichier absent');
else {
  if (!/^User-agent: \*$/m.test(robots) || !/^Allow: \/$/m.test(robots)) signaler('/robots.txt', 'tous les robots doivent être autorisés');
  if (/^Disallow: \/\s*$/m.test(robots)) signaler('/robots.txt', 'Disallow: / interdit tout le site');
  if (!/^Sitemap: https:\/\/guyboireau\.com\/sitemap-index\.xml$/m.test(robots)) signaler('/robots.txt', 'sitemap absent');
}

if (existsSync(join(RACINE, 'og-image.png'))) {
  const entete = readFileSync(join(RACINE, 'og-image.png')).subarray(16, 24);
  const [largeur, hauteur] = [entete.readUInt32BE(0), entete.readUInt32BE(4)];
  if (largeur !== 1200 || hauteur !== 630) signaler('/og-image.png', `${largeur}×${hauteur} au lieu des 1200×630 déclarés`);
} else signaler('/og-image.png', 'fichier absent');

// ─── Résultat ────────────────────────────────────────────────────────────────
for (const [page, problemes] of echecs) {
  console.error(`✗ ${page}`);
  problemes.forEach((p) => console.error(`    ${p}`));
}
console.log(echecs.size ? `\n${echecs.size} fichier(s) en échec` : `\n${pages.length} pages et fichiers annexes conformes`);
process.exit(echecs.size ? 1 : 0);
