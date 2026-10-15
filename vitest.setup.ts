import '@testing-library/jest-dom/vitest'

// Injection explicite des variables d'environnement pour les tests
// (évite que process.env vide hérité du parent ne surcharge .env.test)
Object.assign(import.meta.env, {
  ANTHROPIC_API_KEY: 'mock-anthropic-key',
  SCW_SECRET_KEY: 'mock-scaleway-key',
  SCW_PROJECT_ID: '00000000-0000-4000-8000-000000000000',
})
