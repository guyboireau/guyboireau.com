/**
 * En-têtes de sécurité — source unique.
 *
 * Pourquoi ce fichier et pas `vercel.json` : l'adaptateur `@astrojs/vercel`
 * produit une sortie « Build Output API », dans laquelle Vercel lit le routage
 * depuis `.vercel/output/config.json` et IGNORE le bloc `headers` de
 * `vercel.json`. Ces en-têtes étaient déclarés dans `vercel.json` depuis le
 * 2026-05-12 et n'ont jamais été servis : mesuré le 2026-09-08, la production
 * ne renvoyait que `strict-transport-security`, qui vient de Vercel lui-même.
 *
 * L'intégration `vercelSecurityHeaders` ci-dessous les réinjecte dans la
 * configuration réellement lue, après le build.
 */

/** @type {Record<string, string>} */
export const securityHeaders = {
  // Depuis le 2026-09-15, la politique complète — default-src, script-src,
  // style-src, img/connect/font, frame-src, object-src, base-uri, form-action —
  // est dans chaque page : une <meta http-equiv> générée par Astro
  // (security.csp, directives dans csp.mjs) avec les empreintes sha256 de
  // chaque script et style en ligne (hydratation des îlots React, scripts et
  // styles de composants). Plus de 'unsafe-inline' : les empreintes sont
  // recalculées à chaque build, et `npm run test:csp` échoue si un script ou
  // un style en ligne est resté sans la sienne.
  //
  // Ici ne reste que ce qu'une meta ne peut pas porter : frame-ancestors. Ne
  // pas remettre default-src ni script-src dans cet en-tête : en-tête et meta
  // s'appliquent tous les deux, et un default-src 'self' ici bloquerait les
  // scripts en ligne malgré leurs empreintes. Même règle pour le snippet Caddy
  // du VPS (vps-ovh/deploiement).
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

/**
 * Intégration Astro : ajoute les en-têtes en tête des routes de
 * `.vercel/output/config.json`, avec `continue: true` pour que le routage
 * normal se poursuive ensuite.
 */
export function vercelSecurityHeaders() {
  return {
    name: 'vercel-security-headers',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const { readFile, writeFile } = await import('node:fs/promises')
        const path = '.vercel/output/config.json'
        const config = JSON.parse(await readFile(path, 'utf8'))
        config.routes = [
          { src: '/(.*)', headers: securityHeaders, continue: true },
          ...(config.routes ?? []),
        ]
        await writeFile(path, JSON.stringify(config, null, 2))
        logger.info(
          `${Object.keys(securityHeaders).length} en-têtes de sécurité injectés dans ${path}.`,
        )
      },
    },
  }
}
