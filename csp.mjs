/**
 * Content-Security-Policy — source unique, partagée par astro.config.mjs
 * (Vercel) et astro.config.vps.mjs (VPS).
 *
 * Astro (security.csp) émet dans chaque page une <meta http-equiv> qui porte
 * ces directives plus les empreintes sha256 de chaque script et style en
 * ligne qu'il produit (hydratation des îlots React, scripts de composants,
 * styles scopés). Les empreintes sont recalculées à chaque build : elles
 * suivent les composants. `npm run test:csp` (scripts/csp-check.mjs) vérifie
 * après build qu'aucun script ni style en ligne n'est resté sans la sienne.
 *
 * Ce qu'une meta ne peut pas porter — frame-ancestors — reste en en-tête HTTP
 * (security-headers.mjs côté Vercel, snippet Caddy côté VPS). Ne pas remettre
 * script-src/style-src/default-src dans cet en-tête : en-tête et meta
 * s'appliquent tous les deux, et un default-src 'self' en en-tête bloquerait
 * les scripts en ligne malgré leurs empreintes.
 */
export const csp = {
  directives: [
    "default-src 'self'",
    "font-src 'self'",
    "img-src 'self' data: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ],
}
