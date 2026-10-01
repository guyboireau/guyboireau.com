-- ============================================================
-- MIGRATION : LECTURE DES DEMANDES DE CONTACT RÉSERVÉE À LA CLÉ DE SERVICE
-- Date : 25 septembre 2026 — NON APPLIQUÉE (à passer par Guy)
--
-- La migration 20260901120000 accordait la lecture de portfolio_contacts au
-- rôle `authenticated` (grant select + policy `using (true)`). Le site n'a
-- aucun usage de l'authentification : ce droit ne sert à rien, mais il laisse
-- tout compte authentifié sur ce projet Supabase lire tous les messages reçus
-- — noms, adresses e-mail, contenus. Seule la clé de service doit lire.
--
-- Après cette migration :
--   - anon          : insertion seule (formulaire public, inchangé) ;
--   - authenticated : aucun droit ;
--   - service_role  : lecture et suppression (contourne la RLS ; sert aussi à
--                     la purge à 3 ans, public.purge_portfolio_contacts()).
-- ============================================================

begin;

drop policy if exists "authenticated peut lire les messages" on public.portfolio_contacts;

revoke all on public.portfolio_contacts from authenticated;

-- Explicite plutôt que de dépendre des privilèges par défaut du schéma public.
grant select, delete on public.portfolio_contacts to service_role;

commit;

-- ============================================================
-- VÉRIFICATION, après application :
--
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'portfolio_contacts'
--   order by grantee, privilege_type;
--   -- attendu : anon → INSERT ; service_role → DELETE, SELECT (et ses droits
--   -- par défaut) ; aucune ligne pour authenticated.
--
--   select policyname, roles, cmd
--   from pg_policies
--   where schemaname = 'public' and tablename = 'portfolio_contacts';
--   -- attendu : une seule policy, « anon peut déposer un message » (INSERT).
-- ============================================================
