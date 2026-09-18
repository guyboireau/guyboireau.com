// Configuration de production : le site est hébergé sur le VPS OVH.
// astro.config.mjs reste intact pour les aperçus Vercel, qui ne servent plus
// que les prévisualisations de PR — Vercel ne porte plus que le nom de domaine,
// le temps du transfert.
//
//   npx astro build --config astro.config.vps.mjs
//
// Trois différences avec astro.config.mjs :
//  - adaptateur @astrojs/node en mode standalone, au lieu de @astrojs/vercel ;
//  - intégration vercelSecurityHeaders retirée : elle réinjecte les en-têtes dans
//    la sortie Build Output API, qui n'existe pas ici. Caddy les pose ;
//  - __ON_VERCEL__ fixé à false. Ce drapeau n'a plus d'usage dans src/ depuis le
//    passage à Umami (2026-09-17) : il peut être retiré avec globals.d.ts.
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'
import { csp } from './csp.mjs'

export default defineConfig({
  site: 'https://guyboireau.com',
  security: { csp },
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    define: { __ON_VERCEL__: 'false' },
  },
})
