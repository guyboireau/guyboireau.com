// Configuration dédiée au VPS OVH (voir ~/Dev/vps-ovh/README.md). astro.config.mjs
// reste intact : il pilote toujours le déploiement Vercel.
//
//   npx astro build --config astro.config.vps.mjs
//
// Trois différences avec astro.config.mjs :
//  - adaptateur @astrojs/node en mode standalone, au lieu de @astrojs/vercel ;
//  - intégration vercelSecurityHeaders retirée : elle réinjecte les en-têtes dans
//    la sortie Build Output API, qui n'existe pas ici. Caddy les pose ;
//  - __ON_VERCEL__ fixé à false : le beacon Vercel Analytics répondrait 404.
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://guyboireau.com',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    define: { __ON_VERCEL__: 'false' },
  },
})
