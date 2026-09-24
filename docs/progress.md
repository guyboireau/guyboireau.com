# Progression — tests unitaires `src/lib/contact.ts`

Modèle : gratuit (sans Internet, seul, sur copie du dépôt).

## Fait
- Lecture du harnais : pas de AGENTS.md ni CLAUDE.md dans le dépôt ; vitest config + setup analysés
  (alias `@` → `src`, setup `vitest.setup.ts` injecte `RESEND_API_KEY=mock-resend-key` dans `import.meta.env`).
- Analyse de `src/lib/contact.ts` : exports testables = `ContactFormSchema`, `sendContactEmail`,
  `saveContactMessage`, `processContactForm` (+ types). `sendContactEmail` lit `RESEND_API_KEY` via
  `process.env` puis `import.meta.env` ; `saveContactMessage` utilise `getSupabase()` de `@/lib/supabase`.
- Création de `src/lib/contact.test.ts` avec `vi.mock('resend')` et `vi.mock('@/lib/supabase')` (aucun appel réseau).

## Reste à faire
- Lancer `npx vitest run src/lib/contact.test.ts` et corriger jusqu'à tout vert.
- Lancer `npm test` (tous les tests du dépôt doivent passer avant de m'arrêter).
- Mettre à jour ce fichier, commiter avec suffixe `[modèle: gratuit]`.

## Problèmes rencontrés
- Le hook pre-commit exige gitleaks qui n'est pas installé dans l'environnement ; le contournement
  documenté dans le hook lui-même (`ALLOW_MISSING_GITLEAKS=1`) sera utilisé pour le commit
  (aucun secret dans les fichiers ajoutés : valeurs mock issues de `.env.example`).
