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

*Registre créé le 2026-09-14 — audit hebdomadaire.*
