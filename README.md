# guyboireau.com

Portfolio personnel de **Guy Boireau**, développeur web freelance basé à Bordeaux.

- **Site** : [https://guyboireau.com](https://guyboireau.com)
- **Contact** : [me@guyboireau.com](mailto:me@guyboireau.com)

---

## Stack

| Technologie | Version |
|-------------|---------|
| Astro | 6.x |
| React | 19.x |
| Tailwind CSS | 4.x |
| TypeScript | strict |
| Déploiement | Vercel |

---

## Fonctionnalités

- **Chatbot IA** — Assistant conversationnel propulsé par Claude Haiku 4.5 via streaming SSE
- **Formulaire de contact** — Validation Zod, persistance Supabase et envoi d'email via Resend
- **SEO avancé** — JSON-LD (Person / LocalBusiness), sitemap auto-généré, balises Open Graph, métadonnées géographiques
- **Animations CSS** — Animations légères avec prise en charge de `prefers-reduced-motion`
- **Analytics** — Vercel Analytics + Google Tag Manager (`GTM-K2J6DN5X`, injecté dans `BaseLayout.astro`)

---

## Pages

| Page | Chemin | Description |
|------|--------|-------------|
| Accueil | `/` | Hero, présentation, social proof |
| À propos | `/a-propos` | Parcours, expérience, stack |
| Services | `/services` | Offres de développement et maintenance |
| Automatisations | `/automatisations` | Solutions IA et automatisation |
| Projets | `/projets` | Portfolio des réalisations |
| Contact | `/contact` | Formulaire et coordonnées |
| Mentions légales | `/mentions-legales` | Informations légales |

---

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/chat` | `POST` | Streaming SSE vers Claude Haiku 4.5 avec rate limiting (10 req/min par IP) |
| `/api/contact` | `POST` | Validation Zod, insertion Supabase, envoi Resend avec rate limiting (5 req/min par IP) |

### Sécurité des API

Les deux endpoints utilisent un rate limiter en mémoire (Map côté serveur Astro), défini dans `src/lib/rate-limit.ts`, avec une **fenêtre fixe** par IP : à la première requête, `resetAt` est fixé à `now + windowMs` ; une fois la fenêtre expirée, le compteur repart à 1. Chaque endpoint a son propre compteur (`chatRateLimiter`, `contactRateLimiter`).

> ⚠️ Ce rate limiter est réinitialisé à chaque cold start et n'est pas partagé entre les instances serverless — il ne protège réellement que sur une même instance. Voir les limitations documentées en tête de `src/lib/rate-limit.ts`.

Le client Supabase server (`src/lib/supabase.server.ts`) est utilisé par `/api/contact`. Il instancie un `createClient(url, anonKey)` simple, **sans gestion de cookies ni de session** : les requêtes partent avec la clé anonyme et restent donc soumises aux Row Level Security policies.

---

## Scripts

```bash
npm run dev      # Serveur de développement Astro
npm run build    # Build de production
npm run preview  # Prévisualisation du build
npm run check    # Vérification TypeScript (astro check)
npm run lint     # Lint ESLint + type check
npm run test     # Tests unitaires avec Vitest
```

---

## Supabase

Le projet utilise deux clients Supabase, tous deux basés sur un `createClient(url, anonKey)` simple (pas de `@supabase/ssr`, pas d'authentification) :

| Client | Fichier | Usage |
|--------|---------|-------|
| Browser | `src/lib/supabase.ts` | `getSupabase()` — lit `import.meta.env`. Utilisé par `PricingGrid.tsx` (lecture de `pricing_tiers`) et `src/lib/contact.ts` (insertion dans `contacts`) |
| Server | `src/lib/supabase.server.ts` | `getSupabaseServer()` — lit `process.env` pour éviter d'inliner la clé dans le bundle SSR. Utilisé par `/api/contact` (insertion dans `portfolio_contacts`) |

Le projet ne contient aucun code d'authentification : les deux clients ne servent qu'à lire et écrire de la donnée.

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

| Variable | Type | Dans `.env.example` | Description |
|----------|------|---------------------|-------------|
| `PUBLIC_SUPABASE_URL` | Publique | oui | URL du projet Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Publique | oui | Clé anonyme Supabase |
| `ANTHROPIC_API_KEY` | Privée | oui | Clé API Anthropic (Claude) |
| `RESEND_API_KEY` | Privée | oui | Clé API Resend (envoi d'emails) |

> `cp .env.example .env` suffit désormais : les quatre variables réellement lues par le
> code y figurent. Sans `RESEND_API_KEY`, `src/pages/api/contact.ts` journalise
> `[contact] RESEND_API_KEY manquante` et répond en 500 — l'insertion Supabase a bien eu
> lieu, mais aucun email n'est parti.

---

## CI / CD

Le workflow GitHub Actions (`.github/workflows/ci.yml`) s'exécute à chaque push et à chaque pull request sur `main` et `develop` :

1. Checkout du code
2. Setup Node.js 22 avec cache `npm`
3. Cache du build Astro (`.astro`, `.vite`)
4. Installation des dépendances (`npm ci`)
5. **Lint** (`npm run lint`)
6. **Type check** (`npm run check`)
7. **Tests** (`npm run test -- --coverage`)
8. **Upload du rapport de couverture**
9. **Build** (`npm run build`)

---

## Licence

Propriétaire — Guy Boireau.
