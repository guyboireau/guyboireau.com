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
  // Tout ce que la page charge vient de la même origine — polices comprises —
  // sauf Google Tag Manager, déclaré dans `BaseLayout.astro`. Vercel Analytics
  // passe par `/_vercel/insights/*`, donc par `'self'`.
  //
  // `'unsafe-inline'` sur script-src est requis par l'amorce GTM, qui est un
  // script en ligne. `'unsafe-eval'` reste absent.
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    // GTM installe un <iframe> de repli sans JavaScript.
    "frame-src https://www.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
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
