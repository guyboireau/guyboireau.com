-- ============================================================
-- MIGRATION: PURGE DES DEMANDES DE CONTACT
-- Date: 1er septembre 2026
--
-- Les mentions légales annoncent une conservation de 3 ans pour les
-- demandes reçues via le formulaire de contact. Rien ne l'appliquait :
-- portfolio_contacts grossissait indéfiniment. Une durée annoncée mais
-- non appliquée est un manquement à l'art. 5.1.e (limitation de la
-- conservation), et c'est le genre de point qu'un contrôle vérifie en
-- une requête.
-- ============================================================

begin;

create or replace function public.purge_portfolio_contacts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted integer;
begin
  delete from public.portfolio_contacts
  where created_at < now() - interval '3 years';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

comment on function public.purge_portfolio_contacts() is
  'Supprime les demandes de contact de plus de 3 ans (durée annoncée dans les mentions légales).';

-- PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction nouvellement créée.
-- Couplé à `security definer`, cela rendrait cette purge déclenchable par le
-- rôle `anon` — dont la clé est publique — c'est-à-dire un effacement de
-- données à la demande de n'importe qui. On la réserve au planificateur.
revoke all on function public.purge_portfolio_contacts() from public;
revoke all on function public.purge_portfolio_contacts() from anon;
revoke all on function public.purge_portfolio_contacts() from authenticated;

commit;

-- ============================================================
-- PLANIFICATION — une seule fois, après activation de pg_cron
-- (Dashboard Supabase → Database → Extensions → pg_cron) :
--
--   select cron.schedule(
--     'purge-portfolio-contacts',
--     '30 3 * * 0',                      -- tous les dimanches à 3 h 30
--     $$select public.purge_portfolio_contacts()$$
--   );
--
-- Vérifier :  select * from cron.job;
-- ============================================================
