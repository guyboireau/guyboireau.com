/**
 * Vérifie, sur le HTML produit par le build (`dist/client` avec l'adaptateur node, `.vercel/output/static` avec Vercel — passer le dossier en argument), que chaque page
 * porte une meta Content-Security-Policy et que tout script et style en ligne
 * y a son empreinte sha256. Sans cette vérification, un script en ligne sans
 * empreinte serait bloqué par le navigateur en silence : la page semblerait
 * saine, la fonctionnalité serait morte.
 *
 * Attributs `style="…"` : interdits, la CSP ne les autorise pas (pas de
 * 'unsafe-inline', pas de 'unsafe-hashes') — passer par une classe.
 *
 * Lancé par `npm run test:csp`, après `npm run build`.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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

const empreinte = (texte) => `'sha256-${createHash('sha256').update(texte).digest('base64')}'`;
const directive = (csp, nom) =>
  csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${nom} `)) ?? '';
const estExecutable = (attributs) =>
  !/\bsrc=/.test(attributs) && !/\btype="(application\/(ld\+)?json|text\/template)"/.test(attributs);

let echecs = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const nom = '/' + relative(RACINE, page);
  const csp = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/i)?.[1];
  const problemes = [];

  if (!csp) {
    problemes.push('aucune meta Content-Security-Policy');
  } else {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter((m) => estExecutable(m[1]))
      .map((m) => m[2]);
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
    const scriptSrc = directive(csp, 'script-src');
    const styleSrc = directive(csp, 'style-src');

    for (const d of [scriptSrc, styleSrc]) {
      if (d.includes("'unsafe-inline'") || d.includes("'unsafe-eval'")) problemes.push(`token unsafe dans « ${d.slice(0, 40)}… »`);
    }
    scripts.filter((s) => !scriptSrc.includes(empreinte(s))).forEach((s) =>
      problemes.push(`script en ligne sans empreinte : « ${s.trim().slice(0, 60).replace(/\s+/g, ' ')}… »`),
    );
    styles.filter((s) => !styleSrc.includes(empreinte(s))).forEach((s) =>
      problemes.push(`style en ligne sans empreinte : « ${s.trim().slice(0, 60).replace(/\s+/g, ' ')}… »`),
    );
    const attributsStyle = html.match(/<[a-z][^>]*\sstyle="[^"]*"/gi) ?? [];
    attributsStyle.forEach((tag) => problemes.push(`attribut style interdit : ${tag.slice(0, 80)}`));
    if (/\son[a-z]+="/i.test(html)) problemes.push('gestionnaire on*= en ligne, bloqué par la CSP');
  }

  if (problemes.length) {
    echecs += 1;
    console.error(`✗ ${nom}`);
    problemes.forEach((p) => console.error(`    ${p}`));
  } else {
    console.log(`✓ ${nom}`);
  }
}

if (pages.length === 0) {
  console.error(`aucune page HTML dans ${RACINE} — lancer npm run build avant`);
  process.exit(1);
}
console.log(echecs ? `\n${echecs} page(s) en échec` : `\n${pages.length} pages, toutes couvertes par leur CSP`);
process.exit(echecs ? 1 : 0);
