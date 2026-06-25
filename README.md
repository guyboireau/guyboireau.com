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

- **Chatbot IA** — Assistant conversationnel propulsé par Claude 3.5 Haiku via streaming SSE
- **Formulaire de contact** — Validation Zod, persistance Supabase et envoi d'email via Resend
- **SEO avancé** — JSON-LD (Person / LocalBusiness), sitemap auto-généré, balises Open Graph, métadonnées géographiques
- **Animations CSS** — Animations légères avec prise en charge de `prefers-reduced-motion`
- **Analytics** — Vercel Analytics

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
| `/api/chat` | `POST` | Streaming SSE vers Claude 3.5 Haiku avec rate limiting (5 req/min par IP) |
| `/api/contact` | `POST` | Validation Zod, insertion Supabase, envoi Resend avec rate limiting (3 req/heure par IP) |

### Sécurité des API

Les deux endpoints utilisent un rate limiter en mémoire (Map côté serveur Astro) avec fenêtres glissantes indépendantes. Le client Supabase server (`supabase/server.ts`) est utilisé côté API pour bénéficier de la session SSR et des Row Level Security policies.

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

Le projet utilise deux clients Supabase :

| Client | Fichier | Usage |
|--------|---------|-------|
| Browser | `src/lib/supabase/client.ts` | Composants React (authentification) |
| Server | `src/lib/supabase/server.ts` | Endpoints API (SSR, cookies de session) |

---

## Variables d'environnement

Créer un fichier `.env` à la racine (voir `.env.example`) :

| Variable | Type | Description |
|----------|------|-------------|
| `PUBLIC_SUPABASE_URL` | Publique | URL du projet Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Publique | Clé anonyme Supabase |
| `ANTHROPIC_API_KEY` | Privée | Clé API Anthropic (Claude) |
| `RESEND_API_KEY` | Privée | Clé API Resend (envoi d'emails) |

---

## CI / CD

Le workflow GitHub Actions (`.github/workflows/ci.yml`) s'exécute à chaque push / PR sur `main` :

1. Checkout du code
2. Setup Node.js 20 avec cache `npm`
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
