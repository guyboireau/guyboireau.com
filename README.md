# guyboireau.com

Portfolio personnel de **Guy Boireau**, développeur web freelance basé à Bordeaux.

- **Site** : [https://guyboireau.com](https://guyboireau.com)
- **Contact** : [me@guyboireau.com](mailto:me@guyboireau.com)

---

## Stack

| Technologie | Version |
|-------------|---------|
| Astro | 6.x |
| @astrojs/vercel | 10.x |
| React | 19.x |
| Tailwind CSS | 4.x |
| TypeScript | strict |
| Déploiement | Vercel |

---

## Fonctionnalités

- **Chatbot IA** — Assistant conversationnel propulsé par Claude via streaming SSE
- **Formulaire de contact** — Validation Zod, persistance Supabase et envoi d'email via Resend
- **SEO avancé** — JSON-LD (Person / LocalBusiness), sitemap auto-généré, balises Open Graph, métadonnées géographiques
- **Animations CSS** — Animations légères avec prise en charge de `prefers-reduced-motion`
- **Analytics** — Vercel Analytics
- **Sécurité renforcée** — Rate limiting sur `/api/chat` et `/api/contact`, headers HTTP via `vercel.json`, client Supabase serveur dédié (`@supabase/supabase-js` SSR), overrides CVE (`devalue`, `fast-uri`)

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
| `/api/chat` | `POST` | Streaming SSE vers Claude avec rate limiting (IP + User-Agent) |
| `/api/contact` | `POST` | Validation Zod, insertion Supabase (client serveur SSR), envoi Resend avec rate limiting |

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
