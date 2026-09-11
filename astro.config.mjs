import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import { vercelSecurityHeaders } from './security-headers.mjs'

export default defineConfig({
  site: 'https://guyboireau.com',
  adapter: vercel(),
  integrations: [
    react(),
    sitemap(),
    vercelSecurityHeaders(),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Vercel Analytics n'a de sens que derrière Vercel : ailleurs (VPS,
      // Caddy) son beacon `/_vercel/insights/view` répond 404 à chaque page.
      // `VERCEL=1` est posé par Vercel au build ; `astro.config.vps.mjs`
      // fixe la valeur à `false`.
      __ON_VERCEL__: JSON.stringify(process.env.VERCEL === '1'),
    },
  },
})
