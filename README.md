# guyboireau.com

Portfolio personnel de **Guy Boireau**, développeur web freelance basé à Bordeaux.

- **Site** : [https://guyboireau.com](https://guyboireau.com)
- **Contact** : [me@guyboireau.com](mailto:me@guyboireau.com)

---

## Stack

| Technologie | Version |
|-------------|---------|
| Astro | 7.x |
| React | 19.x |
| Tailwind CSS | 4.x |
| TypeScript | strict |
| Déploiement | VPS OVH (Node standalone + Caddy) — `astro.config.vps.mjs`, reconstruit à chaque push sur `main` par le pipeline `deploiement@guyboireau`. Voir « Hébergement ». |

---

## Fonctionnalités

- **Chatbot IA** — Assistant conversationnel propulsé par Claude Haiku 4.5 via streaming SSE
- **Formulaire de contact** — Validation Zod, persistance Supabase et envoi d'email via Resend
- **SEO avancé** — JSON-LD (Person / LocalBusiness), sitemap auto-généré, balises Open Graph, métadonnées géographiques
- **Animations CSS** — Animations légères avec prise en charge de `prefers-reduced-motion`
- **Analytics** — Umami auto-hébergé sur le VPS (`stats.guyboireau.com`) depuis le 2026-09-17, en remplacement de Vercel Analytics. Sans cookie ni identifiant persistant : aucune bannière requise, mais la mesure **est déclarée** dans les mentions légales (art. 13 RGPD). Google Tag Manager a été retiré le 2026-09-01 : il se chargeait au premier octet, sans bannière ni Consent Mode.
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
| Page introuvable | `/404` | Page 404 du site |

---

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/chat` | `POST` | Streaming SSE vers Claude Haiku 4.5 avec rate limiting (10 req/min par IP) |
| `/api/contact` | `POST` | Validation Zod, insertion Supabase, envoi Resend avec rate limiting (5 req/min par IP) |

### Sécurité des API

Les deux endpoints utilisent un rate limiter en mémoire (Map côté serveur Astro), défini dans `src/lib/rate-limit.ts`, avec une **fenêtre fixe** par IP : à la première requête, `resetAt` est fixé à `now + windowMs` ; une fois la fenêtre expirée, le compteur repart à 1. Chaque endpoint a son propre compteur (`chatRateLimiter`, `contactRateLimiter`).

> En production (VPS), un seul processus Node sert le site : le compteur est commun à
> toutes les requêtes et repart de zéro à chaque redémarrage, donc à chaque déploiement.
> L'adresse vue par Astro est celle de Caddy (127.0.0.1 ou ::1) : Astro 7 ne lit
> `X-Forwarded-For` que si `security.allowedDomains` est configuré. Depuis le
> 2026-09-25, `src/lib/client-ip.ts` prend la première adresse de `X-Forwarded-For`
> **quand la connexion vient de la boucle locale**, et ignore cet en-tête sinon (un
> client direct pourrait le forger). Cela suppose que Caddy remplace l'en-tête reçu,
> ce qu'il fait tant qu'aucun `trusted_proxies` n'est configuré. Avant, tous les
> visiteurs partageaient le même quota (10 messages de chat et 5 envois de contact par
> minute pour tout le site).

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
npm run test:csp # Empreintes CSP du HTML produit — exige un `npm run build` préalable
```

> `test:csp` (`scripts/csp-check.mjs`) lit `.vercel/output/static/` : il vérifie que chaque
> page porte sa `<meta http-equiv="Content-Security-Policy">` et que tout script ou style
> en ligne y a son empreinte sha256. Sans lui, un script en ligne sans empreinte serait
> bloqué en silence par le navigateur — la page paraîtrait saine, la fonctionnalité serait
> morte.
>
> `npm run build` utilise `astro.config.mjs` (adaptateur Vercel) : c'est ce build que la CI
> vérifie. La production est construite avec `astro.config.vps.mjs` (adaptateur Node). Pour
> contrôler ce build-là : `npx astro build --config astro.config.vps.mjs`, puis
> `node scripts/csp-check.mjs` (dossier par défaut : `dist/client/`).

---

## Supabase

Le projet utilise deux clients Supabase, tous deux basés sur un `createClient(url, anonKey)` simple (pas de `@supabase/ssr`, pas d'authentification) :

| Client | Fichier | Usage |
|--------|---------|-------|
| Browser | `src/lib/supabase.ts` | `getSupabase()` — lit `import.meta.env`. Appelé seulement par `src/components/PricingGrid.tsx` (lecture de `pricing_tiers`) et `src/lib/contact.ts` (insertion dans `contacts`), **deux fichiers importés nulle part** : ce client ne sert pas sur le site en ligne |
| Server | `src/lib/supabase.server.ts` | `getSupabaseServer()` — lit `process.env` pour éviter d'inliner la clé dans le bundle SSR. Utilisé par `/api/contact` (insertion dans `portfolio_contacts`) |

Le projet ne contient aucun code d'authentification : les deux clients ne servent qu'à lire et écrire de la donnée.

La seule écriture réelle en base est celle de `/api/contact` dans `portfolio_contacts`
(`supabase/migrations/20260901120000_portfolio_contacts.sql`). Aucune migration du dépôt
ne crée `pricing_tiers` ni `contacts`.

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

Le workflow GitHub Actions (`.github/workflows/ci.yml`) s'exécute à chaque push et à chaque pull request sur `main`, sauf si seuls des `*.md`, `docs/**`, `LICENSE` ou `.gitignore` changent :

1. Checkout du code
2. Setup Node.js 22 avec cache `npm`
3. Cache du build Astro (`.astro`, `.vite`)
4. Installation des dépendances (`npm ci`)
5. **Lint** (`npm run lint`)
6. **Type check** (`npm run check`)
7. **Tests** (`npm run test -- --coverage`)
8. **Upload du rapport de couverture**
9. **Build** (`npm run build`, version Vercel : voir la note sous « Scripts »)
10. **CSP** (`npm run test:csp`) — après le build, sur le HTML produit

---

## Hébergement

- **Production** : `guyboireau.com` (et `www`, redirigé en 301) est servi par Caddy sur le
  VPS OVH, devant le service Node `guyboireau.service`. Un push sur `main` déclenche, par
  webhook GitHub, le pipeline `deploiement@guyboireau` : `npm ci`, build avec
  `astro.config.vps.mjs` dans une nouvelle release, bascule, contrôle de santé. Procédure
  complète : dépôt `vps-ovh`, `README.md`, section « guyboireau.com sur le VPS ».
- **Aperçus** : chaque PR ouverte sur `main` a son site, `https://pr-<n>.apercu.guyboireau.com`
  (workflow `apercu.yml`, accès protégé par mot de passe).
- **Vercel** : le projet Vercel existe toujours et **redéploie la production à chaque push**
  (dernier : `9f7392f`, le 2026-09-23), plus un aperçu par branche ;
  `guyboireau-com.vercel.app` répond toujours. Il ne sert plus le domaine. Le nom de
  domaine et sa zone DNS restent chez Vercel jusqu'au transfert vers OVH, prévu au
  moment du renouvellement (décembre 2026).

---

## Licence

Propriétaire — Guy Boireau.
