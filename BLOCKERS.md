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
Au 2026-10-05 : **OPEN 4 · LANDED 1 · SHIPPED 2 · REFUTED 1**
Au 2026-10-05 (PR #62) : **OPEN 2 · LANDED 2 · SHIPPED 3 · REFUTED 1**
Au 2026-10-07 : **OPEN 2 · LANDED 3 · SHIPPED 3 · REFUTED 1**
Au 2026-10-08 : **OPEN 2 · LANDED 2 · SHIPPED 3 · REFUTED 2**
Au 2026-10-12 : **OPEN 3 · LANDED 1 · SHIPPED 4 · REFUTED 2**
Au 2026-10-12, relevés VPS et projets (session locale) : **OPEN 2 · LANDED 0 · SHIPPED 6 · REFUTED 2** (B08 et B10 → SHIPPED ; B06 : reclassement proposé, décision de Guy ; B01 : prérequis du ruleset dans cette PR)
Au 2026-10-12, checks requis posés : **OPEN 1 · LANDED 0 · SHIPPED 7 · REFUTED 2** (B01 → SHIPPED ; reste B02 OPEN)
Au 2026-10-19, audit hebdomadaire : **OPEN 1 · LANDED 0 · SHIPPED 7 · REFUTED 2** (inchangé ; B02 OPEN depuis 35 jours, cause plateforme non établie — les PR #68, #71, #72 et #73 ont toutes déclenché leur CI)
Au 2026-10-26, audit hebdomadaire : **OPEN 1 · LANDED 1 · SHIPPED 7 · REFUTED 2** (B11 ouvert et LANDED dans la PR de cet audit : 6 high en prod, garde d'audit de `ci` rouge au prochain run ; B02 OPEN depuis 42 jours)

---

## B01 — `main` n'est pas protégé : aucun gate n'est opposable

- [x] **statut: SHIPPED** · ouvert le 2026-09-14 · ruleset 23932480 complété le 2026-10-12 (`required_status_checks` : `ci`, `build-vps`, `🔐 Détection de secrets`), prérequis CI par #67 (`cf3d779`) · re-prouvé le 2026-10-12 · sécurité

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

**Relevé (2026-10-05).** Inchangé : toujours `deletion`, `non_fast_forward`,
`pull_request` (0 approbation), aucune règle `required_status_checks` (même commande
que ci-dessus). Les quatre PR mergées le 2026-10-01 (#56, #58, #59, #60) avaient
leur `ci` vert avant la fusion — par discipline, pas par contrainte : #58 a été
fusionnée 3 min après son ouverture, #59 6 min après. Ouvert depuis 21 jours.

**Relevé (2026-10-05, PR #62).** Toujours `["deletion","non_fast_forward","pull_request"]`
(même commande). Hors de portée d'un agent : l'ajout de `required_status_checks` (`ci`,
`build-vps`, `🔐 Détection de secrets`) au ruleset 23932480 est une décision de Guy.
Reste OPEN.

**Relevé (2026-10-12).** Inchangé : `["deletion","non_fast_forward","pull_request"]`
(ruleset 23932480, 0 approbation), `"protected": true`, toujours aucune règle
`required_status_checks` (même commande). Ouvert depuis 28 jours. Décision de Guy.


**SHIPPED le 2026-10-12** (accord de Guy du même jour). Prérequis : #67 (`cf3d779`) retire le
`paths-ignore` du déclencheur `pull_request` de `ci.yml`, sans quoi une PR de documentation
n'aurait jamais rapporté `ci` ni `build-vps`. Puis `required_status_checks` ajouté au ruleset,
chaque check lié à l'application GitHub Actions (id 15368, relevé sur les check-runs de #66) pour
qu'un statut posé par un tiers ne le satisfasse pas ; `strict` désactivé (pas d'obligation d'être
à jour de `main`). `allow_auto_merge` activé le même jour : l'auto-merge attend désormais les
trois checks. Ruleset d'avant sauvegardé hors dépôt (JSON de `gh api …/rulesets/23932480`).

```sh
gh api repos/guyboireau/guyboireau.com/rules/branches/main --jq '[.[].type]'
# → ["deletion","non_fast_forward","pull_request","required_status_checks"]
gh api repos/guyboireau/guyboireau.com/rulesets/23932480 \
  --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[] | "\(.context) (app \(.integration_id))"'
# → ci (app 15368) · build-vps (app 15368) · 🔐 Détection de secrets (app 15368)
gh api repos/guyboireau/guyboireau.com --jq .allow_auto_merge
# → true
```

Preuve d'usage : cette PR, qui ne touche que `BLOCKERS.md`, est fusionnée par auto-merge
seulement après les trois checks (voir son historique). Avant #67, `ci.yml` ne se serait pas
déclenché sur elle.
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

**Relevé (2026-10-05).** #58 et #59 (ouvertes le 2026-10-01) ont reçu `ci`,
`🔐 Détection de secrets` et `lien`, tous verts ; elles portent aussi encore
`Vercel Preview Comments` (le projet Vercel reste relié). Le cas #38 reste isolé.
Ouvert depuis 21 jours.

**Relevé (2026-10-05, PR #62).** Relu : le constat ne relève pas du code. Les deux
workflows déclarent bien `pull_request: branches: [main]` sans filtre qui exclurait
une PR de code, et la cause du cas #38 est côté plateforme (jeton ou compte Actions).
La parade au motif décrit (« une PR verte d'aperçu ressemble à une PR validée ») est
B01 : des checks requis. Rien à corriger dans le dépôt. Reste OPEN.

**Relevé (2026-10-12).** Aucune PR ouverte ; les trois PR fusionnées depuis le dernier
relevé (#63, #64, #65) ont toutes reçu `ci` et `Secret Scan` sur `main` (runs 146, 148,
150, verts). Le cas #38 reste isolé. Ouvert depuis 28 jours.

**Relevé (2026-10-26).** Aucune PR ouverte. La seule PR fusionnée depuis le dernier relevé,
#74, a reçu `ci` sur `main` (run 169, 13dc0c5, vert). Le cas #38 reste isolé et sans cause
établie. Ouvert depuis 42 jours.

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

- [x] **statut: SHIPPED** · ouvert le 2026-09-28 · livré par #56 (eaed8aa, mergée le 2026-10-01) · re-prouvé sur `main` fa50d82 le 2026-10-05 · sécurité, parcours utilisateur

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

**Re-preuve sur `main` (2026-10-05, fa50d82, après `npm ci`)** — `client-ip.ts` est
sur `main` et branché sur les deux routes limitées :

```sh
npx vitest run src/lib/client-ip.test.ts          # → 1 fichier, vert
git grep -n "adresseVisiteur" -- src/pages/api     # → chat.ts:8 et contact.ts:9 (import + appel)
```

Reste hors dépôt : l'hypothèse « Caddy sans `trusted_proxies` remplace
`X-Forwarded-For` » (commentaire de `client-ip.ts`) n'a pas été rejouée contre le VPS.

---

## B05 — Simulateur de prix : l'abonnement mensuel est ajouté au prix de création, et part dans la demande de devis

- [x] **statut: SHIPPED** · ouvert le 2026-09-28 · livré par #56 (eaed8aa) · re-prouvé sur `main` fa50d82 le 2026-10-05 · argent, parcours utilisateur

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

**Re-preuve sur `main` (2026-10-05, fa50d82)** — le test est désormais dans le dépôt,
et la refonte #60 (qui a réécrit 84 lignes du simulateur) ne l'a pas cassé :

```sh
npx vitest run src/components/PricingSimulator.test.tsx -t "abonnement coché"
# → Tests 1 passed | 8 skipped (filtre -t) ; fichier complet : 9 verts
grep -n "isSubscription" src/components/PricingSimulator.tsx
# → l. 102 : `if (opt && !block.isSubscription)` exclut l'abonnement du total création
```

---

## B06 — `portfolio_contacts` lisible par tout compte `authenticated`

- [x] **statut: REFUTED** · ouvert le 2026-09-28 · `begin;`/`commit;` retirés par #62 · clos le 2026-10-08 : la table n'a jamais existé en prod, Supabase retiré du site · données personnelles

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

**Relevé (2026-10-05).** La migration de correction est **sur `main`** depuis #56,
mais rien ne l'applique (le pipeline du site joue `npm ci` puis le build, pas les
migrations) : la prod reste dans l'état de `20260901120000`. Ouvert depuis 7 jours.
À noter avant de l'appliquer : le fichier contient `begin;` / `commit;`. Si elle passe
un jour par un `migrer.sh` qui enveloppe déjà chaque fichier dans une transaction
(cas des autres sites du VPS), le `commit;` interne casse l'atomicité avec
l'enregistrement de la version.

```sh
git grep -nE '^(begin|commit);' -- supabase/migrations/20260925090000_portfolio_contacts_lecture_service_role.sql
# → l. 18 begin; · l. 27 commit;
```

**Correctif (2026-10-05, PR #62, branche `claude/eager-feynman-uc9cch`).** `begin;` et
`commit;` retirés de la migration de correction **et** de `20260901140000_contacts_retention.sql`,
qui portait le même défaut ; SQL inchangé par ailleurs. Garde : `tests/migrations.test.ts`
(nom `<chiffres>_<nom>.sql`, aucune instruction de transaction hors commentaires).

```sh
git fetch origin claude/eager-feynman-uc9cch && git checkout origin/claude/eager-feynman-uc9cch
git grep -niE '^\s*(begin|commit);' -- supabase/migrations     # → rien
npx vitest run tests/migrations.test.ts                         # → 7 verts
# Rouge avant : sur ab8c8d4, le même test échoue sur les deux fichiers
git show ab8c8d4:supabase/migrations/20260925090000_portfolio_contacts_lecture_service_role.sql \
  | grep -nE '^(begin|commit);'                                 # → l. 18, l. 27
```

**LANDED ne ferme pas la fuite** : la prod reste dans l'état de `20260901120000` tant que
la migration n'est pas jouée. Passe SHIPPED quand #62 est sur `main` **et** que le
transcript de vérification (`role_table_grants`, `pg_policies`, en fin de fichier) est
collé ici, sans ligne pour `authenticated`. Application par Guy : `supabase db push`
(projet lié), ou `psql "$URL_DB" --single-transaction -f supabase/migrations/20260925090000_portfolio_contacts_lecture_service_role.sql`
puis les deux requêtes de vérification.


**Clôture (2026-10-08) — REFUTED : la fuite décrite n'a jamais pu avoir lieu.**

Le projet Supabase de prod (celui de `PUBLIC_SUPABASE_URL`) a été relevé le 2026-10-08,
au niveau du schéma et en lecture seule : son schéma `public` ne contient **aucune**
table, vue ni fonction, et le projet n'a **aucun** utilisateur Auth (base vide, ~9,7 Mo).
`portfolio_contacts` n'a jamais été créée : le pipeline du site n'applique pas les
migrations, et `20260901120000` n'a jamais été jouée à la main. Il n'y a donc jamais eu de
demande de contact en base à lire, par `authenticated` ou par qui que ce soit. Corollaire :
l'insertion de `/api/contact` échouait à chaque envoi (journal
`[contact] échec insertion portfolio_contacts`) ; l'email Resend partait, et c'était le
seul canal réel. Le projet était en pause au moins du 2026-09-08 au 2026-10-08.

Décision de Guy (2026-10-08) : retirer Supabase du site, garder la demande de contact
dans l'email seulement, puis supprimer le projet. Fait par la PR de cette date (branche
`claude/epic-johnson-zn50u2`) : bloc d'insertion retiré de `/api/contact`, clients
`src/lib/supabase*.ts` et `database.types.ts` supprimés, dossier `supabase/migrations/`
(les trois fichiers `portfolio_contacts`) et `tests/migrations.test.ts` supprimés,
`@supabase/supabase-js` désinstallé, `*.supabase.co` retiré de la CSP, variables
`PUBLIC_SUPABASE_*` retirées de `.env.example` et de la CI, politique de confidentialité
mise à jour (plus de base, Supabase retiré des sous-traitants et des transferts).

**Preuve re-exécutable** (côté dépôt, après la fusion)

```sh
git ls-files supabase                                   # → rien
git grep -n "portfolio_contacts\|getSupabase\|@supabase/" -- src tests package.json  # → rien
git grep -niE 'supabase' -- src csp.mjs .env.example .github
# → seulement des mentions de compétences / projets clients (system-prompt.ts,
#   BaseLayout.astro, a-propos, index, projets, traitement-documentaire) ; aucune dans
#   confidentialite.astro, contact.ts, csp.mjs, .env.example ni la CI
node -e "console.log(require('./package-lock.json').packages['node_modules/@supabase/supabase-js'])"  # → undefined
npx vitest run tests/pages/api/contact.test.ts          # → vert, aucun mock Supabase
```

Reste hors dépôt, à Guy : retirer `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` de
l'environnement de `guyboireau.service` (et, au choix, du projet Vercel), puis supprimer
le projet Supabase.

**Correction (2026-10-09).** Le relevé ci-dessus est faux : la table existe et n'est pas
vide. Mesuré sur le projet `dvtrprdongexycflyyir` (celui de `PUBLIC_SUPABASE_URL` en prod,
nommé « caltounian ») par le MCP Supabase : `select count(*) from public.portfolio_contacts`
→ **15**. Le même projet porte aussi les tables de l'ancien projet CAltounian (`User` 2
lignes, `Appointment` 12, RLS désactivée). **Ne pas supprimer le projet** avant d'avoir
repris les 15 demandes (dans `crm.demandes`, voir README « Lien avec le CRM ») et décidé du
sort des données CAltounian. Le formulaire, lui, dépose de nouveau ses demandes dans une
base depuis le 2026-10-09, celle du CRM sur le VPS.

---

## B07 — `http-cache-semantics` 4.2.0 (advisory high) dans l'arbre de production

- [x] **statut: SHIPPED** · ouvert le 2026-10-05 · livré par #61 (ab8c8d4) · re-prouvé sur `main` ab8c8d4 le 2026-10-05 · sécurité

`astro` 7.3.2 tire `http-cache-semantics` 4.2.0, visé par GHSA-ch52-4w7c-c8xp
(« max-stale handling can disclose cross-user cached responses », high, `<=4.2.0`).
C'est la seule vulnérabilité de `npm audit --omit=dev` sur `main` fa50d82. Astro s'en
sert pour la politique de cache des images distantes ; le site n'en charge aucune à
ce jour, l'exploitabilité réelle est donc faible — mais le paquet est livré en prod.

**Preuve re-exécutable** (sur `main` fa50d82, après `npm ci`)

```sh
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":1,"critical":0,"total":1}
npm ls http-cache-semantics   # → astro@7.3.2 └─ http-cache-semantics@4.2.0
```

**Correctif** — `npm audit fix` sans `--force` (lockfile seul, 4.2.0 → 4.3.0), PR de
l'audit du 2026-10-05 sur `claude/eager-feynman-uc9cch`. Après correctif :
`npm audit --omit=dev` → `"high":0,"total":0` ; lint, `tsc --noEmit`, 189 tests et
build verts. Passe SHIPPED quand la PR est sur `main` et l'audit rejoué.

Reste en arbre complet, **dev seulement** : 5 high via `eslint-plugin-astro` →
`astro-eslint-parser` → `fast-glob` → `micromatch` → `braces` 3.0.3
(GHSA-vfj7-8cjw-p6xm, aucune version 3.x corrigée ; `npm audit` ne propose qu'une
rétrogradation majeure d'`eslint-plugin-astro`). Exécuté seulement au lint, sur du
code du dépôt : non retenu comme constat.

**Re-preuve sur `main` (2026-10-05, ab8c8d4)** — worktree détaché de `origin/main` :

```sh
git worktree add --detach /tmp/main-ab8 origin/main && cd /tmp/main-ab8
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
node -e "console.log(require('./package-lock.json').packages['node_modules/http-cache-semantics'].version)"
# → 4.3.0
```

Garde ajoutée par #62 : étape CI `npm audit --omit=dev --audit-level=high` (job `ci`).

---

## B08 — Assistant IA : le sous-traitant déclaré (Mistral AI, UE) ne dépend que d'une variable d'environnement ; le repli du code part chez Anthropic (États-Unis)

- [x] **statut: SHIPPED** · ouvert le 2026-10-05 · code sur `main` (#62, 8267ff2) · re-prouvé en prod le 2026-10-12 : `/api/chat` en 503 sur le VPS et sur Vercel, aucun fournisseur appelé · données personnelles

Depuis #56 et #60, `confidentialite.astro`, le bandeau de `ChatBot.tsx` et
`public/llms.txt` disent aux visiteurs que leurs messages au chatbot vont chez
**Mistral AI, dans l'Union européenne**. Le code, lui, appelle le SDK Anthropic :
`model: process.env.CHAT_MODEL || CLAUDE_MODEL`, avec `CLAUDE_MODEL =
'claude-haiku-4-5-20251001'` et `ANTHROPIC_BASE_URL` facultative. La déclaration
n'est vraie que si, en prod, `ANTHROPIC_BASE_URL` pointe le relais LiteLLM du VPS
**et** `CHAT_MODEL` vise un groupe routé vers Mistral. Sans l'une des deux, les
messages partent chez Anthropic, aux États-Unis — un transfert hors UE que la
politique de confidentialité ne mentionne plus (art. 13 et 44 RGPD).

Deux faits aggravent :
1. le projet Vercel redéploie encore `main` à chaque push (README, « Hébergement ») et
   `guyboireau-com.vercel.app` répond : `.env.example` ne fixe ni `CHAT_MODEL` ni
   `ANTHROPIC_BASE_URL`, et un relais en `127.0.0.1:4000` n'existe pas chez Vercel ;
2. en une semaine, trois fournisseurs ont été écrits pour la même fonction :
   Gemini (#55, `f6ec101`), Mistral AI (#56, #60), Claude (code). Aucun test ne lie
   la déclaration au code.

Exploitabilité en prod **non mesurée** : cet audit n'a lu ni l'environnement du
service `guyboireau.service` ni la configuration LiteLLM, et n'a pas interrogé le site.

**Preuve re-exécutable**

```sh
git grep -n "CHAT_MODEL || CLAUDE_MODEL\|new Anthropic" -- src/pages/api/chat.ts
git grep -n "CLAUDE_MODEL" -- src/data/ai-config.ts      # → 'claude-haiku-4-5-20251001'
git grep -n "Mistral AI" -- src/pages/confidentialite.astro src/components/ChatBot.tsx public/llms.txt
git grep -n "CHAT_MODEL\|ANTHROPIC_BASE_URL" -- .env.example   # → lignes commentées seulement
# Fermeture attendue : transcript de l'environnement du service sur le VPS
#   (CHAT_MODEL + ANTHROPIC_BASE_URL) et de la route LiteLLM du groupe → Mistral,
#   ET soit l'arrêt du projet Vercel, soit l'absence d'ANTHROPIC_API_KEY valide chez lui.
```

**Correctif proposé** — décision de Guy (données personnelles, config de déploiement) :
faire échouer `/api/chat` (503) quand `CHAT_MODEL` ou `ANTHROPIC_BASE_URL` manque en
production au lieu de replier sur Claude, et un test qui lie le fournisseur déclaré
à la configuration exigée.

**Correctif (2026-10-05, PR #62, branche `claude/eager-feynman-uc9cch`).** Le code honore
la déclaration ou se ferme :
- `src/lib/assistant-config.ts` : `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` et
  `CHAT_MODEL` obligatoires ; base URL illisible ou visant `anthropic.com` refusée ;
- `/api/chat` : configuration incomplète → **503** `ASSISTANT_NON_CONFIGURE`, aucun client
  SDK construit, détail au journal seulement ; le client vise `baseURL` ;
- modèle par défaut supprimé de `src/data/ai-config.ts` ;
- `useChat`/`ChatBot` : sur 503, message de repli et lien « Écrire à Guy » (`/contact`) ;
- `src/lib/assistant-config.test.ts` lie la déclaration (confidentialité 2.2 et
  transferts, bandeau, `llms.txt` : Mistral AI et aucun autre) à la configuration exigée ;
- job CI `build-vps` : serveur Node de prod démarré sans relais → `/api/chat` en 503.

```sh
git fetch origin claude/eager-feynman-uc9cch && git checkout origin/claude/eager-feynman-uc9cch && npm ci
npx vitest run tests/pages/api/chat.test.ts src/lib/assistant-config.test.ts \
  src/hooks/useChat.test.ts src/components/ChatBot.test.tsx      # → 4 fichiers, verts
git grep -nE "CHAT_MODEL\s*(\|\||\?\?)" -- src                    # → rien
# Rouge avant : les tests de chat.test.ts sur le chat.ts de ab8c8d4 → 7 échecs
git show ab8c8d4:src/pages/api/chat.ts > src/pages/api/chat.ts
git show ab8c8d4:src/data/ai-config.ts > src/data/ai-config.ts
npx vitest run tests/pages/api/chat.test.ts                      # → 7 failed | 14 passed
git checkout -- src
# Fumée, build de prod :
npx astro build --config astro.config.vps.mjs
env -u ANTHROPIC_BASE_URL -u CHAT_MODEL HOST=127.0.0.1 PORT=4321 ANTHROPIC_API_KEY=x node dist/server/entry.mjs &
curl -s -w ' %{http_code}\n' -X POST -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:4321' \
  -d '{"messages":[{"role":"user","content":"Bonjour"}]}' http://127.0.0.1:4321/api/chat
# → {"error":"L'assistant n'est pas disponible…","code":"ASSISTANT_NON_CONFIGURE"} 503
```

Passe SHIPPED quand #62 est sur `main` et que : (1) l'environnement de
`guyboireau.service` montre `ANTHROPIC_BASE_URL` = relais LiteLLM et `CHAT_MODEL` = groupe
routé vers Mistral (transcript de la route LiteLLM collé ici) ; (2) le projet Vercel est
coupé, ou y sert un `/api/chat` en 503. Hors dépôt, décision et accès de Guy.

**Relevé (2026-10-12) — le code est sur `main` (#62, 8267ff2), re-prouvé sur 813314d.**

```sh
git checkout 813314d && npm ci
npx vitest run tests/pages/api/chat.test.ts src/lib/assistant-config.test.ts \
  src/hooks/useChat.test.ts src/components/ChatBot.test.tsx      # → 4 fichiers, 75 verts
git grep -nE "CHAT_MODEL\s*(\|\||\?\?)" -- src                    # → rien
# Fumée du build de prod : job `build-vps` vert sur main 813314d (run CI 150).
```

Reste LANDED : les deux conditions de fermeture sont hors dépôt (environnement de
`guyboireau.service` et route LiteLLM ; projet Vercel coupé ou en 503). Aucun agent n'y a
accès. Décision et accès de Guy.

---

## B09 — `source-map-js` et `sharp` (advisories high) dans l'arbre de production : CI de `main` rouge

- [x] **statut: SHIPPED** · ouvert le 2026-10-07 · livré par #63 (94440dc, mergée le 2026-10-08) · re-prouvé sur `main` 813314d le 2026-10-12 · sécurité

Depuis le 2026-10-06, l'étape `npm audit --omit=dev --audit-level=high` (garde de B07)
fait échouer `ci` sur `main` 8267ff2. Trois paquets livrés en prod :
`source-map-js` 1.2.1 (GHSA-68fv-2mgg-jv7q, high, DoS par offsets de sections indexées ;
via `@tailwindcss/node` et `svgo` → `css-tree`), `sharp` 0.35.4 (GHSA-wq5f-xc86-pv6w,
high, librsvg ; via `astro`), `smol-toml` 1.8.0 (GHSA-r4xh-jqrq-34v2, moderate).

**Preuve re-exécutable** (sur `main` 8267ff2, après `npm ci`)

```sh
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":1,"high":2,"critical":0,"total":3}
```

**Correctif** — `npm audit fix` sans `--force`, lockfile seul, aucune `overrides` :
sharp 0.35.4 → 0.35.5, source-map-js 1.2.1 → 1.2.2, smol-toml 1.8.0 → 1.9.0.
`@astrojs/node` conservé (B03).

```sh
npm ci && npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
npm ls sharp source-map-js smol-toml | grep -oE '(sharp|source-map-js|smol-toml)@[0-9.]+' | sort -u
# → sharp@0.35.5 · smol-toml@1.9.0 · source-map-js@1.2.2
```

Lint, `astro check`, 189 tests, build Vercel, `test:csp`, `test:pages`, build
`astro.config.vps.mjs` et fumée du serveur Node (accueil 200, `/api/chat` 503) verts.
Les 5 high restants en arbre complet sont ceux de `braces`, dev seulement (voir B07).
Passe SHIPPED quand la PR est sur `main` et l'audit rejoué.

**Re-preuve sur `main` (2026-10-12, 813314d, après `npm ci`)**

```sh
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
npm ls sharp source-map-js smol-toml | grep -oE '(sharp|source-map-js|smol-toml)@[0-9.]+' | sort -u
# → sharp@0.35.5 · smol-toml@1.9.0 · source-map-js@1.2.2
```

L'étape CI `npm audit --omit=dev --audit-level=high` est verte sur `main` depuis le run 146
(94440dc). En arbre complet, toujours les 5 high de `braces` (dev seulement, B07).

---

## B10 — Ancien projet Supabase cloud : 15 demandes de contact et des tables CAltounian sans RLS, toujours en ligne

- [x] **statut: SHIPPED** · ouvert le 2026-10-12 · fermé par la suppression du projet `dvtrprdongexycflyyir` (Guy, 2026-10-09), constatée le 2026-10-12 · données personnelles, sécurité

Ce constat reprend ce que la correction datée du 2026-10-09 de B06 a établi, et que
B06 (classé REFUTED le 2026-10-08 sur un relevé reconnu faux depuis) ne porte plus :
le projet `dvtrprdongexycflyyir` (« caltounian »), celui de `PUBLIC_SUPABASE_URL`,
contient **15 lignes dans `public.portfolio_contacts`** (nom, e-mail, message de
prospects) et les tables de l'ancien projet CAltounian, **`User` (2 lignes) et
`Appointment` (12 lignes), RLS désactivée**. Sur Supabase, une table du schéma `public`
sans RLS est lisible et modifiable par le rôle `anon` tant que les droits par défaut
n'ont pas été retirés ; la clé `anon` n'est pas un secret (préfixe `PUBLIC_`, livrée
au navigateur par conception). Le site ne lit plus ce projet depuis #64, mais le projet,
lui, reste en ligne.

Ni le reclassement de B06 (REFUTED contredit par sa propre correction) ni la décision
sur ces données ne sont du ressort d'un agent : l'identifiant B06 reste figé, ce
constat-ci porte l'action.

Exploitabilité **non mesurée** : le MCP Supabase de l'audit du 2026-10-12 répond
« You do not have permission to perform this action » sur ce projet (`execute_sql` et
`get_advisors`). Rien dans le dépôt à corriger (Supabase en est retiré, B06).

**Preuve re-exécutable** (SQL en lecture, métadonnées seulement, aucune donnée lue)

```sql
begin read only;
select c.relname, c.relrowsecurity as rls,
       has_table_privilege('anon', c.oid, 'select')          as anon_select,
       has_table_privilege('anon', c.oid, 'insert')          as anon_insert,
       has_table_privilege('authenticated', c.oid, 'select') as auth_select,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 1;
rollback;
-- Ouvert si une ligne a rls = false et anon_select = true (attendu : User, Appointment),
-- ou si portfolio_contacts est lisible par anon/authenticated.
```

```sh
# Côté dépôt : la clé anon a bien été livrée sous préfixe PUBLIC_ jusqu'à #64
git show c66ca9b^:src/lib/supabase.ts | grep -n PUBLIC_SUPABASE_ANON_KEY
```

**Correctif attendu — décision de Guy** (données personnelles, RLS) : reprendre les 15
demandes dans `crm.demandes` (README, « Lien avec le CRM »), décider du sort des données
CAltounian (export puis suppression, ou `alter table … enable row level security` en
attendant), puis supprimer le projet. Fermeture : transcript de la requête ci-dessus sans
ligne exposée, ou projet supprimé (capture de la liste des projets).

---

## Relevés du 2026-10-12 (session locale, accès VPS et comptes) — B10, B08, B06, B01

### B10 → SHIPPED — le projet n'existe plus

Le constat a été écrit le 2026-10-12 sans pouvoir interroger le projet (« You do not have
permission » du MCP). Mesure du même jour, depuis le poste de Guy :

```sh
dig dvtrprdongexycflyyir.supabase.co +noall +comments | grep status
# → status: NXDOMAIN
curl -s -o /dev/null -w '%{http_code}\n' --max-time 15 https://dvtrprdongexycflyyir.supabase.co/rest/v1/
# → 000 (aucune résolution)
# MCP Supabase list_projects (compte de la CLI) → un seul projet, vrxgquddqqbrwbdycpco (Niido) ;
# dvtrprdongexycflyyir absent.
ssh ovh-vps 'docker exec agent-freelance-db psql -U postgres -Atc "select origine, statut, count(*) from crm.demandes group by 1,2"'
# → import|traitee|14
```

Le projet a été **supprimé par Guy le 2026-10-09** après la reprise de 14 des 15 demandes
dans `crm.demandes` (origine `import`) ; la 15ᵉ était un essai de 8 caractères. Les tables
CAltounian (`User` 2 lignes, `Appointment` 12) ont disparu avec le projet : il n'y a plus
rien à exporter, à protéger par RLS ni à supprimer. Le plan (a)–(d) proposé pour ce constat
est donc sans objet. Fermeture conforme au critère de l'entrée : « projet supprimé (liste des
projets) ».

### B08 → SHIPPED — l'assistant est coupé, aucun message ne part

```sh
ssh ovh-vps 'systemctl show guyboireau.service -p EnvironmentFiles'
# → EnvironmentFiles=/srv/apps/guyboireau/.env
ssh ovh-vps 'PID=$(systemctl show guyboireau.service -p MainPID --value);
  sudo cat /proc/$PID/environ | tr "\0" "\n" | grep -oE "^(ANTHROPIC_BASE_URL|CHAT_MODEL|ANTHROPIC_API_KEY)="'
# → ANTHROPIC_API_KEY=   (seule des trois ; ni ANTHROPIC_BASE_URL ni CHAT_MODEL)
curl -s -w ' %{http_code}\n' -X POST -H 'Content-Type: application/json' -H 'Origin: https://guyboireau.com' \
  -d '{"messages":[{"role":"user","content":"Bonjour"}]}' https://guyboireau.com/api/chat
# → {"error":"L'assistant n'est pas disponible…","code":"ASSISTANT_NON_CONFIGURE"} 503
curl -s -w ' %{http_code}\n' -X POST -H 'Content-Type: application/json' -H 'Origin: https://guyboireau-com.vercel.app' \
  -d '{"messages":[{"role":"user","content":"Bonjour"}]}' https://guyboireau-com.vercel.app/api/chat
# → {"error":"L'assistant n'est pas disponible…","code":"ASSISTANT_NON_CONFIGURE"} 503
ssh ovh-vps 'sudo sed -n "/model_name: assistant-site/,+1p" /srv/agents/litellm/config.yaml | sed -E "s/api_key: [^,}]*/api_key: …/"'
# → model_name: assistant-site · model: mistral/mistral-small-latest (groupe sans repli)
```

Condition (2) de l'entrée remplie : le projet Vercel sert un `/api/chat` en 503. Condition (1)
remplie **autrement** : au lieu d'un `CHAT_MODEL` routé vers Mistral, la prod n'a pas de
relais configuré et le code (#62) refuse de répondre — aucun message de visiteur ne part, ni
chez Anthropic ni ailleurs. C'est l'état voulu tant que la bascule Mistral attend l'offre API
et la désactivation de l'entraînement. Pour réactiver : `ANTHROPIC_BASE_URL=http://127.0.0.1:4000`,
`CHAT_MODEL=assistant-site` et la clé **du harnais** dans `ANTHROPIC_API_KEY`.

**Hors registre, à décider par Guy** : `ANTHROPIC_API_KEY` du `.env` du VPS a la forme d'une
vraie clé Anthropic (`sk-ant-…`), inutilisée depuis #62 ; le projet Vercel en porte une aussi
(Development, Preview…). Les retirer (et révoquer la clé) ne casse rien.

### B06 — reclassement proposé (statut inchangé, décision de Guy)

B06 est `REFUTED` depuis le 2026-10-08 sur un relevé reconnu faux par sa propre correction du
2026-10-09 (`portfolio_contacts` existait, 15 lignes). Le motif « la table n'a jamais existé »
ne tient donc plus, et REFUTED exige un faux positif **prouvé**. Le risque décrit (toute
session `authenticated` du projet lit les demandes) n'a jamais été mesuré sur la prod, et ne
peut plus l'être. Il a pris fin avec le projet : retrait de Supabase du site (#64), reprise des
demandes dans `crm.demandes` (#65), suppression du projet le 2026-10-09 (preuves de B10
ci-dessus). Proposition : **B06 → SHIPPED**, fermé par la suppression du projet. Le motif du
2026-10-08 resterait au registre, barré par cette correction. Le statut ne bouge pas sans
l'accord de Guy (pas de reclassement sans lui).

### B01 — prérequis du ruleset levé dans cette PR

`ci.yml` ignorait les PR qui ne touchent que `**/*.md`, `docs/**`, `LICENSE` ou `.gitignore`.
Un workflow sauté par filtre de chemins ne rapporte aucun statut : avec `ci` et `build-vps`
requis, une PR de documentation serait restée bloquée « en attente ». Cette PR retire le
`paths-ignore` du déclencheur `pull_request` (celui de `push` reste : il n'a aucun check
requis). Après sa fusion : `required_status_checks` (`ci`, `build-vps`,
`🔐 Détection de secrets`) sur le ruleset 23932480 et `allow_auto_merge`, puis re-preuve
(`gh api repos/guyboireau/guyboireau.com/rulesets/23932480`) et B01 → SHIPPED.

---

## B11 — `zod` < 4.6.6 (advisory high) et chaîne `@vercel/*` dans l'arbre de production : la garde d'audit de `ci` rouge au prochain run

- [ ] **statut: LANDED** · ouvert le 2026-10-26 · correctif sur `claude/eager-feynman-kn41hx` (PR de l'audit du 2026-10-26), non mergé · sécurité

`npm audit --omit=dev` sur `main` 13dc0c5 remonte **6 high** et 1 low, alors que l'étape CI
`npm audit --omit=dev --audit-level=high` (garde de B07) est un check requis (`ci`, B01) :
le dernier run vert de `main` (169, 2026-10-19) est antérieur aux advisories, et la
prochaine PR, quelle qu'elle soit, aura `ci` rouge et ne pourra pas fusionner.

- `zod` 4.5.4, dépendance directe (GHSA-mrhx-c7xc-m3w5, high, `<4.6.6` : consommation
  mémoire lors de la validation de collections bornées surdimensionnées). Utilisé par les
  deux routes publiques. Exploitabilité en prod **faible** : `/api/chat` répond 503 avant
  de lire le corps tant que l'assistant n'est pas configuré (B08), et `contactSchema` ne
  contient aucune collection ; `chatBodySchema` (`z.array(...).max(20)`) le serait dès la
  réactivation de l'assistant.
- `@vercel/cli-config` 0.2.0 → épingle `zod` **4.1.11 exact** (même dans sa dernière
  version 0.3.3) ; en remontent `@vercel/oidc`, `@vercel/functions` et `@astrojs/vercel`
  (build Vercel, pas le VPS — mais livrés selon `npm audit`).
- `undici` 8.10.2 (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c ; via
  `astro` → `unifont`), `vite` 8.1.4 (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22 et
  `launch-editor`), `astro` 7.3.2 (GHSA-mpr7-6m5w-76rw, low).

**Preuve re-exécutable** (rouge, sur `main` 13dc0c5, après `npm ci`)

```sh
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":1,"moderate":0,"high":6,"critical":0,"total":7}
jq .dependencies.zod node_modules/@vercel/cli-config/package.json   # → "4.1.11"
```

**Correctif** — lockfile dans les plages de `package.json` (`astro` 7.4.1, `@astrojs/vercel`
11.0.16, `zod` 4.6.7, `undici` 8.12.3, `vite` 8.3.5), plus une `override` ciblée
`"@vercel/cli-config": { "zod": "^4.6.6" }` (seul moyen : l'épinglage exact est dans la
dernière version publiée). `@astrojs/node` conservé (B03). Au passage, outillage de dev :
`vitest`/`@vitest/coverage-v8` 4.1.12 (GHSA-qxg6-89mg-rqv8, moderate) et override
`fast-uri` `^3.1.9` (4 moderate). `npm audit fix` plante sur ce dépôt avec npm 10.9.4
(`Cannot read properties of null (reading 'edgesOut')`, `#loadPeerSet` d'arborist) :
correctif fait par `npm update` ciblé, puis `npm install` en npm 10 pour que `npm ci`
(npm 10, CI) accepte le lockfile.

```sh
git fetch origin claude/eager-feynman-kn41hx && git checkout origin/claude/eager-feynman-kn41hx
rm -rf node_modules && npm ci
npm audit --omit=dev --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
npm ls zod | grep -oE 'zod@[0-9.]+' | sort -u                       # → zod@4.6.7
npm audit --json | jq -c .metadata.vulnerabilities
# → {"info":0,"low":0,"moderate":0,"high":1,"critical":0,"total":1}  (happy-dom, dev)
```

Lint (`astro check` + ESLint), `tsc --noEmit`, 15 fichiers / 206 tests (couverture
98,08/91,79/96,05/98,91, seuils tenus), build Vercel, `test:csp`, `test:pages`, build
`astro.config.vps.mjs` et fumée du serveur Node (accueil 200, `/api/chat` 503
`ASSISTANT_NON_CONFIGURE`) verts localement. Passe SHIPPED quand la PR est sur `main`
et l'audit rejoué.

Reste en arbre complet, **dev seulement** : 1 high, `happy-dom` 20.14.6
(GHSA-834v-8h66-3h79, `17.0.0 - 21.0.3`) ; le correctif est la majeure 21.0.4,
environnement de test seulement : hors de ce correctif sans rupture.

---

*Registre créé le 2026-09-14 — audit hebdomadaire.*
