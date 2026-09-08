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
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        '**/*.d.ts',
        '**/*.config.*',
        'vitest.setup.ts',
      ],
      // La CI exécutait `test --coverage` sans jamais opposer de plancher :
      // la couverture était mesurée, jamais défendue. Calibré quelques points
      // sous le réel du jour (81,93 / 67,83 / 68,57 / 86,23) pour faire cliquet
      // sans rougir au premier refactor. À remonter quand la couverture monte.
      thresholds: {
        statements: 78,
        branches: 63,
        functions: 64,
        lines: 82,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
