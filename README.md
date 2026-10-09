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

- **Chatbot IA** — Assistant conversationnel en streaming SSE ; modèle Mistral AI (UE) par le relais LiteLLM du VPS. Sans relais configuré, `/api/chat` répond 503 et ne contacte aucun fournisseur (B08)
- **Formulaire de contact** — Validation Zod, dépôt de la demande dans le CRM (`crm.demandes`, base du VPS partagée avec l'appli agent-freelance) et email via Resend. L'un peut échouer sans perdre la demande : voir « Lien avec le CRM »
- **Disponibilité et avis** — îlots serveur (`server:defer`) qui lisent le CRM à la demande, gardés 5 minutes en mémoire : la disponibilité sur /contact, les avis publiés sur l'accueil (repli : `src/data/avis.ts`)
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
| Mentions légales | `/mentions-legales` | Éditeur (Guy Boireau EI), directeur de la publication, hébergeur |
| Confidentialité | `/confidentialite` | Traitements de données, droits, cookies, bouton d'opposition à Umami |
| CGV | `/cgv` | Conditions générales de vente et de prestation, médiation (`#mediation`), formulaire de rétractation |
| Page introuvable | `/404` | Page 404 du site (`noindex`) |

`public/llms.txt` résume le site pour les agents d'IA (format llmstxt.org) ; `public/robots.txt`
autorise tous les robots. Les pages légales contiennent des `[À COMPLÉTER]` surlignés : à
remplir avant la mise en production.

---

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/chat` | `POST` | Streaming SSE vers Mistral AI par le relais LiteLLM (`ANTHROPIC_BASE_URL` + `CHAT_MODEL`, obligatoires, sinon 503), rate limiting 10 req/min par IP |
| `/api/contact` | `POST` | Validation Zod, envoi Resend avec rate limiting (5 req/min par IP). Rien n'est stocké côté site |

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

## Lien avec le CRM

Depuis le 2026-10-09, le site partage la base de l'appli de gestion de Guy
(`agent-freelance`) : la pile Supabase auto-hébergée du VPS, schéma `crm`. Il y entre
avec un rôle Postgres à lui, `site_web`, par un jeton signé par la pile (`CRM_JWT`,
émis pour 5 ans, gardé dans `/srv/apps/guyboireau/.env`, jamais côté navigateur).

Ce rôle peut seulement :

- déposer une demande dans `crm.demandes` (nom, email, message, type de projet) ;
- lire `crm.vitrine_avis` (avis publiés) et `crm.vitrine_disponibilite`.

Tout le reste (clients, factures, demandes déjà reçues) lui est refusé par la base.
`src/lib/crm.ts` porte les trois appels, avec un délai de 2,5 s et un cache de 5 minutes
pour les lectures ; en cas d'échec il rend la dernière valeur connue, ou rien.

`/api/contact` dépose la demande puis envoie l'email. Si l'un des deux échoue, la
demande n'est pas perdue et le visiteur reçoit une confirmation ; si les deux échouent,
il voit l'erreur.

Historique : la table `portfolio_contacts` du projet Supabase cloud `dvtr…` a reçu les
demandes jusqu'au 2026-09-21 (15 lignes au 2026-10-09, contrairement à ce qu'affirmait
#64). Le site n'y écrit plus depuis #64 ; ces lignes sont reprises dans `crm.demandes`.

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

| Variable | Type | Dans `.env.example` | Description |
|----------|------|---------------------|-------------|
| `ANTHROPIC_API_KEY` | Privée | oui | Clé du relais LiteLLM du VPS (le SDK parle le protocole Anthropic) |
| `ANTHROPIC_BASE_URL` | Privée | oui | URL du relais LiteLLM (`http://127.0.0.1:4000` sur le VPS). Obligatoire : sans elle, ou si elle vise `anthropic.com`, `/api/chat` répond 503 |
| `CHAT_MODEL` | Privée | oui | Groupe du relais routé vers Mistral AI (ex. `assistant-site`). Obligatoire, aucun modèle par défaut |
| `RESEND_API_KEY` | Privée | oui | Clé API Resend (envoi d'emails) |
| `CRM_URL` | Privée | oui | API de la pile Supabase du VPS (`http://127.0.0.1:8003` en production) |
| `CRM_APIKEY` | Privée | oui | Clé `anon` de la pile (exigée par la passerelle, sans droit sur `crm`) |
| `CRM_JWT` | Privée | oui | Jeton du rôle `site_web` (voir « Lien avec le CRM ») |

> `cp .env.example .env` suffit : les variables réellement lues par le code y
> figurent. Sans les trois `CRM_*` (dev local, aperçus), le formulaire n'envoie que
> l'email et les îlots retombent sur leur repli. Sans `RESEND_API_KEY` ni CRM,
> `src/pages/api/contact.ts` répond en 500 : la demande n'est enregistrée nulle part,
> le visiteur voit l'erreur et doit écrire à me@guyboireau.com.

---

## CI / CD

Le workflow GitHub Actions (`.github/workflows/ci.yml`) s'exécute à chaque push et à chaque pull request sur `main`, sauf si seuls des `*.md`, `docs/**`, `LICENSE` ou `.gitignore` changent :

1. Checkout du code
2. Setup Node.js 22 avec cache `npm`
3. Cache du build Astro (`.astro`, `.vite`)
4. Installation des dépendances (`npm ci`)
5. **Audit** (`npm audit --omit=dev --audit-level=high`) — arbre de production seulement
6. **Lint** (`npm run lint`)
7. **Type check** (`npm run check`)
8. **Tests** (`npm run test -- --coverage`)
9. **Upload du rapport de couverture**
10. **Build** (`npm run build`, version Vercel : voir la note sous « Scripts »)
11. **CSP** (`npm run test:csp`) puis **Pages** (`npm run test:pages`) — après le build, sur le HTML produit

Un second job, `build-vps`, construit la configuration de production
(`npx astro build --config astro.config.vps.mjs`), passe les mêmes contrôles CSP et pages
sur `dist/client/`, puis démarre `dist/server/entry.mjs` : l'accueil doit répondre 200 et
`/api/chat`, sans relais configuré, 503 `ASSISTANT_NON_CONFIGURE` (B08).

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
