import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      // Sans `include`, v8 ne compte que les fichiers importés par un test : un
      // module jamais testé (ou mort) n'apparaît pas et la couverture affichée
      // est surestimée (98,5 % au lieu de 86,6 % le 2026-10-12, à cause d'un
      // module de 178 lignes importé nulle part). Tout TS/TSX de src/ compte.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        '**/*.d.ts',
        '**/*.config.*',
        'vitest.setup.ts',
      ],
      // La CI exécutait `test --coverage` sans jamais opposer de plancher :
      // la couverture était mesurée, jamais défendue. Cliquet : relevé quand
      // la couverture monte, jamais baissé. Réel au 2026-10-19 :
      // 98,08 / 91,79 / 96,05 / 98,91. À remonter quand la couverture monte.
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 88,
        lines: 97,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
