# Registre de dette technique

Ce document centralise l'ensemble des dettes techniques identifiées sur le projet guyboireau.com. Il sert de référentiel unique pour prioriser, suivre et résoudre les problèmes d'architecture, de performance ou de maintenance.

## Format de chaque entrée

| ID | Priorité | Fichier:ligne | Description | Effort estimé | Statut |

## Dettes identifiées

| ID | Priorité | Fichier:ligne | Description | Effort estimé | Statut |
|---|---|---|---|---|---|
| TD-001 | HIGH | `src/pages/api/chat.ts:11` | Rate limiting en mémoire (`Map<string, ...>`) — incompatible avec le multi-instance Vercel Serverless. À remplacer par Redis / Upstash KV. | 2-3h | open |
| TD-002 | HIGH | `src/pages/api/contact.ts:15` | Même problème que TD-001 : rate limiting en mémoire sur la route `/api/contact`. Mutualiser la solution Redis/Upstash avec TD-001. | 1h | open |
| TD-003 | MEDIUM | `src/pages/api/contact.ts:83` | L'adresse d'expédition Resend est `onboarding@resend.dev`. En production, configurer un domaine vérifié (ex: `no-reply@guyboireau.com`) pour éviter les filtres spam et améliorer la délivrabilité. | 30min | open |
| TD-004 | LOW | `src/pages/api/chat.ts:87` | Modèle Claude hardcodé en `claude-3-5-haiku-latest`. Centraliser la constante du modèle dans `src/data/ai-config.ts` pour faciliter les mises à jour lors des nouvelles releases Anthropic. | 30min | open |
| TD-005 | LOW | `src/lib/supabase.ts` | Le client Supabase est un singleton module-level. En SSR Astro (multi-requête), ce pattern est acceptable mais doit être documenté. Si le projet évolue vers du edge rendering, migrer vers une factory par requête. | 1h | watch |

## Comment contribuer

Pour ajouter une nouvelle entrée dans ce registre :

1. Attribuer un identifiant unique sous la forme `TD-XXX` (incrémenter le numéro séquentiel).
2. Définir la priorité parmi les niveaux disponibles : `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
3. Indiquer le fichier et la ligne concernée au format `chemin/vers/fichier.ext:numéro`.
4. Rédiger une description concise et actionnable.
5. Estimer l'effort de résolution (format libre : heures, jours, story points).
6. Positionner le statut initial : `open`, `in-progress`, `done` ou `watch`.

Les entrées doivent être ajoutées dans la section "Dettes identifiées" en respectant l'ordre d'insertion chronologique.

## Processus de résolution

L'ordre de traitement recommandé suit la sévérité des priorités :

1. **CRITICAL** : traitement immédiat, blocage potentiel de la production.
2. **HIGH** : planification dans le sprint en cours.
3. **MEDIUM** : intégration au backlog du sprint suivant.
4. **LOW** : résolution opportuniste ou lors d'un sprint dédié au refactoring.

Les entrées marquées `watch` ne nécessitent pas d'action immédiate mais doivent être réévaluées à chaque évolution significative de l'architecture (passage au edge rendering, changement d'hébergeur, etc.).