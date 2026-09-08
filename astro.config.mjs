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
  },
})
