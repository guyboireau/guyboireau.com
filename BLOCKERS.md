# BLOCKERS — guyboireau.com

Registre des constats bloquants. **Mémoire d'un audit à l'autre** : on ajoute, on
ne réécrit pas.

## Règles

- **Identités figées, append-only.** Un `B##` ne change jamais de sens.
- **Quatre états, comptés séparément** — jamais un seul nombre :
  - `OPEN` — ouvert en production (`- [ ]`)
  - `LANDED` — corrigé et prouvé, **pas encore mergé** (`- [ ]`, compte comme ouvert)
  - `SHIPPED` — sur `main` **et** re-prouvé (`- [x]`)
  - `REFUTED` — faux positif **prouvé** (`- [x]`)
- **Preuve re-exécutable collée**, jamais de la prose. Une preuve non rejouable = pas fermé.
- Tout constat touchant **argent, données personnelles, parcours utilisateur ou
  sécurité** entre ici. Pas de reclassement vers le bas sans accord de Guy.

## Compteur (machine-généré, ne pas taper à la main)

```sh
for s in OPEN LANDED SHIPPED REFUTED; do
  echo "$s $(grep -cE "^- \[.\] .*statut: $s" BLOCKERS.md)"
done
```

Au 2026-09-14 : **OPEN 2 · LANDED 0 · SHIPPED 0 · REFUTED 1**
Au 2026-09-28 : **OPEN 3 · LANDED 2 · SHIPPED 0 · REFUTED 1**

---

## B01 — `main` n'est pas protégé : aucun gate n'est opposable

- [ ] **statut: OPEN** · ouvert le 2026-09-14 · sécurité

`main` accepte une poussée directe et n'exige aucun check. `ci.yml` et
`🔐 Détection de secrets` peuvent être rouges, un merge passe quand même.

**Preuve re-exécutable**

```sh
# → "protected": false
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/guyboireau/guyboireau.com/branches/main | jq .protected
```

**Correctif attendu** — protection de branche + checks requis. Décision de Guy.

**Avancement (2026-09-28) — protection posée, mais sans aucun check requis.**

Un ruleset `main protégée (harnais IA)` (id 23932480) est actif depuis le
2026-09-24 : suppression et force-push interdits, PR obligatoire (0 approbation),
aucun contournement. La poussée directe est donc fermée. **Mais le ruleset ne
contient aucune règle `required_status_checks`** : une PR dont `ci` ou
`🔐 Détection de secrets` est rouge se fusionne toujours, et l'auto-merge se
déclenche sans attendre la CI. Le titre du constat reste vrai pour les gates.

```sh
# → types : deletion, non_fast_forward, pull_request — pas de required_status_checks
curl -s https://api.github.com/repos/guyboireau/guyboireau.com/rules/branches/main | jq '.[].type'
```

Reste OPEN. Correctif : ajouter `required_status_checks` (`ci`, `🔐 Détection de secrets`) au ruleset. Décision de Guy.

---

## B02 — Deux PR ouvertes le 2026-09-11 n'ont déclenché aucune exécution de CI

- [ ] **statut: OPEN** · ouvert le 2026-09-14 · sécurité

La PR #38, ouverte le 2026-09-11 à 07:04, ne porte qu'un seul check : le
déploiement d'aperçu Vercel. Aucune exécution de `ci.yml` ni de `secret-scan.yml`
n'a été créée pour elle — alors que la PR #37, ouverte 13 minutes plus tôt sur le
même dépôt, en a bien reçu quatre.

Les deux workflows déclarent pourtant `on: pull_request: branches: [main, develop]`,
et #38 cible `main`. Il n'y a donc pas de filtre de chemin ni de branche qui
l'explique.

Cause non établie. Deux candidates, aucune vérifiée :
1. une PR créée via un jeton d'application GitHub ne déclenche pas les workflows
   `pull_request` (garde-fou anti-récursion de GitHub) ;
2. un arrêt au niveau du compte Actions — le quota de `NiidoOrg` est épuisé depuis
   le 2026-09-10 (confirmé par Guy le 2026-09-14), et la dernière exécution verte de
   ce dépôt date du 2026-09-11 06:52, soit 12 minutes avant #38. À noter toutefois
   que ce dépôt-ci appartient au compte personnel, dont le quota est distinct de
   celui de l'organisation — ce qui affaiblit cette piste sans l'exclure.

Le risque n'est pas #38 elle-même (cf. B03) mais le motif : une PR qui n'affiche
qu'un aperçu Vercel vert **ressemble** à une PR validée. C'est exactement ce qui
a permis à #38 de rester 3 jours en paraissant saine.

**Preuve re-exécutable**

```sh
# Aucune exécution rattachée à la PR 38
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/guyboireau/guyboireau.com/actions/workflows/ci.yml/runs?per_page=5" \
  | jq '.workflow_runs[] | {run_number, head_branch, conclusion}'
# → la plus récente est run 94 / ci/lien-apercu-pr (PR 37). Rien pour
#   claude/gracious-lamport-ho8m20 (PR 38).
```

**Avancement (2026-09-21) — le compte personnel, lui, exécute bien ses workflows.**

La PR #43, ouverte le 2026-09-17 sur une branche `claude/*` de ce dépôt, a reçu
**les deux** workflows, tous deux verts :

```sh
# checks de la PR 43 (tête cbb3601) — relevé le 2026-09-21
#   ci                        success   2026-09-17T08:27:43Z
#   🔐 Détection de secrets   success   2026-09-17T08:27:42Z
#   Vercel Preview Comments   success
```

Cela **écarte la piste 2 pour ce dépôt** : les Actions du compte personnel
fonctionnaient normalement six jours après l'épuisement du quota de `NiidoOrg`,
ce que le registre ne faisait que supposer (« quota distinct — ce qui affaiblit
cette piste sans l'exclure »). C'est désormais établi.

La piste 1 n'est pas confirmée pour autant : #43 est elle aussi sur une branche
`claude/*` et a bien déclenché les workflows. Le cas #38 reste donc **sans cause
établie** — mais il est isolé, pas systémique. Le constat reste ouvert au titre
du motif qu'il décrit : une PR n'affichant qu'un aperçu Vercel vert ressemble à
une PR validée.

**Relevé (2026-09-28).** Les PR #55 et #56, ouvertes le 2026-09-25, ont reçu
`ci` et `🔐 Détection de secrets` (verts), plus `lien` (aperçu). Le cas #38 reste
isolé et sans cause établie. Ouvert depuis 14 jours.

```sh
for n in 55 56; do
  sha=$(curl -s https://api.github.com/repos/guyboireau/guyboireau.com/pulls/$n | jq -r .head.sha)
  curl -s https://api.github.com/repos/guyboireau/guyboireau.com/commits/$sha/check-runs | jq -r '.check_runs[] | "\(.name) \(.conclusion)"'
done
```

---

## B03 — PR #38 « astro 7.3.2 » : vulnérabilité déjà corrigée, et la PR faisait régresser le déploiement VPS

- [x] **statut: REFUTED** · ouvert et clos le 2026-09-14 · sécurité

La PR #38 (ouverte le 2026-09-11, restée 3 jours, non-draft) annonçait la
correction de 8 vulnérabilités dont une RCE critique Astro.

**`main` portait déjà toutes les versions visées** — astro 7.3.2, sharp 0.35.4,
svgo 4.1.0, js-yaml 4.3.2, smol-toml 1.8.0 — et `npm audit` y remonte 0 critical,
0 high, 0 vulnérabilité dans le runtime de production. Valeur résiduelle : nulle.

De plus, sa branche datait d'avant la PR #35 (mergée le 2026-09-11), qui a fait
entrer `@astrojs/node` en `dependencies` parce que `dist/server/entry.mjs`
l'importe au runtime et que chaque `npm ci` l'effaçait sans cela. Le lockfile de
#38 ne contient pas `@astrojs/node` ni sa chaîne serveur (`send`, `http-errors`,
`etag`, `fresh`, `on-finished`…). La fusion produit un conflit sur le lockfile ;
résolue à l'envers, elle remet exactement la panne que #35 venait de corriger —
`astro.config.vps.mjs` importe `@astrojs/node` et le VPS ne démarre plus.

**Preuve re-exécutable**

```sh
# 1. main porte déjà les versions « corrigées », et l'arbre est sain
node -e "const l=require('./package-lock.json');
  for (const k of ['astro','sharp','svgo','js-yaml','smol-toml'])
    console.log(k, l.packages['node_modules/'+k].version)"
npm audit --omit=dev --json | jq .metadata.vulnerabilities   # → tout à 0

# 2. la fusion est en conflit
git fetch origin claude/gracious-lamport-ho8m20
git worktree add --detach /tmp/t38 origin/main && cd /tmp/t38
git merge --no-ff --no-commit origin/claude/gracious-lamport-ho8m20
# → CONFLICT (content): Merge conflict in package-lock.json

# 3. @astrojs/node est bien requis au runtime sur main
grep -n "astrojs/node" astro.config.vps.mjs package.json
```

Clôturée sans merge le 2026-09-14, avec ce constat en commentaire.

---

## B04 — Limitation de débit : tous les visiteurs partagent le même quota derrière Caddy

- [ ] **statut: LANDED** · ouvert le 2026-09-28 · sécurité, parcours utilisateur

En production (VPS, `astro.config.vps.mjs`), `security.allowedDomains` n'est pas
configuré : l'adaptateur Node d'Astro ignore alors `X-Forwarded-For` et
`clientAddress` vaut l'adresse de Caddy (`127.0.0.1`). `/api/contact` (5 req/min)
et `/api/chat` (10 req/min) comptent donc **un seul compteur pour tout le site** :
six envois de formulaire dans la même minute, par n'importe qui, font répondre 429
au prospect suivant. Le README le documentait, le registre non.

**Preuve re-exécutable** (sur `main` 89e2ddc, après `npm ci`)

```sh
cat > xff-probe.mjs <<'EOF'
import { createRequest } from 'astro/app/node'
const sym = Symbol.for('astro.clientAddress')
const mk = () => ({ method: 'GET', url: '/api/contact', headers: { host: 'guyboireau.com',
  'x-forwarded-for': '203.0.113.7' }, socket: { remoteAddress: '127.0.0.1', on(){} }, on(){} })
for (const allowedDomains of [[], [{ hostname: 'guyboireau.com' }]])
  console.log(JSON.stringify(allowedDomains), '->', createRequest(mk(), { allowedDomains, skipBody: true })[sym])
EOF
node xff-probe.mjs; rm xff-probe.mjs
# → []                              -> 127.0.0.1     (configuration de prod)
# → [{"hostname":"guyboireau.com"}] -> 203.0.113.7
grep -n allowedDomains astro.config.vps.mjs   # → rien
```

**Correctif** — PR #56 (`conformite/legal-2026-09`, tête 5df7b8c, non mergée) :
`src/lib/client-ip.ts` lit `X-Forwarded-For` quand la connexion vient de la boucle
locale. Prouvé par `src/lib/client-ip.test.ts` (vert sur 5df7b8c, CI `ci` verte) :

```sh
git worktree add --detach /tmp/t56 origin/conformite/legal-2026-09 && cd /tmp/t56 && npm ci
npx vitest run src/lib/client-ip.test.ts
```

Passe SHIPPED quand #56 est sur `main` et le test rejoué.

---

## B05 — Simulateur de prix : l'abonnement mensuel est ajouté au prix de création, et part dans la demande de devis

- [ ] **statut: LANDED** · ouvert le 2026-09-28 · argent, parcours utilisateur

Sur `/services`, `PricingSimulator.tsx` calcule `oneTimeTotal` en sommant **toutes**
les options cochées, abonnements compris (aucun test sur `block.isSubscription`),
puis affiche en plus `monthlyTotal`. Un abonnement à 15 €/mois gonfle le « Total
création + options » de 15 € ; ce total faux est transmis à `/contact` via
`?budget=`. Le composant n'avait aucun test (0 % de couverture, invisible car la
couverture ne compte que les fichiers importés par un test).

**Preuve re-exécutable** — le test de #56 rejoué contre le composant de `main` :

```sh
git fetch origin conformite/legal-2026-09
git show origin/conformite/legal-2026-09:src/components/PricingSimulator.test.tsx \
  > src/components/PricingSimulator.test.tsx
npx vitest run src/components/PricingSimulator.test.tsx -t "abonnement coché"
# → FAIL : expected 'Total création+options 505 € +15 €/mois…' to contain '490 €'
rm src/components/PricingSimulator.test.tsx
```

**Correctif** — PR #56 (tête 5df7b8c, non mergée) ; le même test y est vert
(`npx vitest run src/components/PricingSimulator.test.tsx` dans le worktree de B04).

---

## B06 — `portfolio_contacts` lisible par tout compte `authenticated`

- [ ] **statut: OPEN** · ouvert le 2026-09-28 · données personnelles

La migration `20260901120000_portfolio_contacts.sql` accorde `select` à
`authenticated` avec une policy `using (true)`. Le site n'a aucun écran
d'authentification : ce droit ne sert à rien, mais tout compte obtenu sur ce
projet Supabase lit l'intégralité des demandes de contact (nom, e-mail, message).
Exploitabilité réelle **non mesurée** : elle dépend de l'ouverture de
`/auth/v1/signup` sur l'instance de prod, que cet audit n'a pas pu interroger.

**Preuve re-exécutable**

```sh
git grep -n -A4 'to authenticated' -- supabase/migrations/20260901120000_portfolio_contacts.sql
# → grant select … to authenticated ; policy … for select to authenticated using (true)
```

**Correctif proposé** — migration `20260925090000_portfolio_contacts_lecture_service_role.sql`
dans #56, **non appliquée** (le pipeline de ce site ne joue pas les migrations).
Preuve de fermeture attendue : transcript `information_schema.role_table_grants`
et `pg_policies` sur la base de prod, sans ligne pour `authenticated`.
Décision de Guy requise : données personnelles / RLS / migration SQL.

---

*Registre créé le 2026-09-14 — audit hebdomadaire.*
