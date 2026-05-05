import '@testing-library/jest-dom/vitest'

// Injection explicite des variables d'environnement pour les tests
// (évite que process.env vide hérité du parent ne surcharge .env.test)
Object.assign(import.meta.env, {
  PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
  ANTHROPIC_API_KEY: 'mock-anthropic-key',
  RESEND_API_KEY: 'mock-resend-key',
})
